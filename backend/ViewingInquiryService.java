package com.sliit.se2030.apartmentsales.service;

import com.sliit.se2030.apartmentsales.model.*;
import com.sliit.se2030.apartmentsales.dto.*;
import com.sliit.se2030.apartmentsales.repository.*;
import com.sliit.se2030.apartmentsales.patterns.*;

import com.sliit.se2030.apartmentsales.model.ApartmentListing;
import com.sliit.se2030.apartmentsales.repository.ApartmentListingRepository;
import com.sliit.se2030.apartmentsales.model.ListingStatus;
import com.sliit.se2030.apartmentsales.patterns.ApartmentSalesEvent;
import com.sliit.se2030.apartmentsales.model.User;
import com.sliit.se2030.apartmentsales.repository.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ViewingInquiryService {

    private final ViewingAppointmentRepository appointmentRepository;
    private final SupportTicketRepository ticketRepository;
    private final ApartmentListingRepository listingRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher; // Observer Pattern

    public ViewingInquiryService(ViewingAppointmentRepository appointmentRepository,
                                 SupportTicketRepository ticketRepository,
                                 ApartmentListingRepository listingRepository,
                                 UserRepository userRepository,
                                 ApplicationEventPublisher eventPublisher) {
        this.appointmentRepository = appointmentRepository;
        this.ticketRepository = ticketRepository;
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    // CRUD 1: CREATE APPOINTMENT
    public ViewingAppointment createAppointment(AppointmentDTO dto, String buyerEmail) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new IllegalArgumentException("Buyer not found: " + buyerEmail));
        ApartmentListing listing = listingRepository.findById(dto.getListingId())
                .orElseThrow(() -> new IllegalArgumentException("Listing not found: " + dto.getListingId()));

        // Business Rule: Tour scheduling and reservation options are available and functional only for Buyer role
        if (buyer.getRole() != Role.BUYER) {
            throw new IllegalStateException("Only registered buyers can schedule viewing tours. Please use a registered Buyer account.");
        }

        if (listing.getStatus() == ListingStatus.SOLD || listing.getStatus() == ListingStatus.RESERVED) {
            throw new IllegalStateException("Viewing tours cannot be booked for reserved or sold residences.");
        }

        // MODULE 3.1: Prevent Double-Booking of Physical Tour Slots
        boolean isSlotBooked = appointmentRepository.existsByListingAndAppointmentDateAndAppointmentTimeAndStatusIn(
                listing,
                dto.getAppointmentDate(),
                dto.getAppointmentTime(),
                List.of(AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED)
        );
        if (isSlotBooked) {
            throw new IllegalStateException("Double booking conflict: The residence '" + listing.getTitle()
                    + "' already has an appointment scheduled on " + dto.getAppointmentDate()
                    + " for slot " + dto.getAppointmentTime() + ". Please select another date or time slot.");
        }

        // MODULE 3.2: Ghost/No-Show Prevention - Cap Active In-Progress Tours per Buyer to 3
        long activeBuyerCount = appointmentRepository.countByBuyerAndStatusIn(
                buyer,
                List.of(AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED)
        );
        if (activeBuyerCount >= 3) {
            throw new IllegalStateException("Active tour limit reached: To prevent ghost bookings and no-shows, buyers are limited to 3 active viewing tour requests simultaneously. Please attend, reschedule or cancel existing tours first.");
        }

        // MODULE 3.2: Ghost/No-Show Prevention - Enforce 10-Digit Contact Phone Number
        String contactPhone = (dto.getContactPhone() != null && !dto.getContactPhone().trim().isEmpty())
                ? dto.getContactPhone().trim()
                : (buyer.getPhone() != null ? buyer.getPhone().trim() : null);

        if (contactPhone == null) {
            throw new IllegalArgumentException("A valid 10-digit contact telephone number (e.g. 0771234567) is required to prevent ghost bookings and confirm your private viewing slot.");
        }
        String cleanPhone = contactPhone.replaceAll("[^0-9]", "");
        if (cleanPhone.length() != 10) {
            throw new IllegalArgumentException("Invalid phone number format (" + contactPhone + "). A valid 10-digit telephone number (e.g. 0771234567) is required.");
        }

        if (buyer.getPhone() == null || buyer.getPhone().isBlank()) {
            buyer.setPhone(contactPhone);
            userRepository.save(buyer);
        }

        ViewingAppointment appt = new ViewingAppointment();
        appt.setListing(listing);
        appt.setBuyer(buyer);
        appt.setAppointmentDate(dto.getAppointmentDate());
        appt.setAppointmentTime(dto.getAppointmentTime());
        appt.setStatus(AppointmentStatus.REQUESTED);
        String combinedNotes = (dto.getNotes() != null && !dto.getNotes().isBlank())
                ? dto.getNotes() + " | Contact Phone: " + contactPhone
                : "Contact Phone: " + contactPhone;
        appt.setNotes(combinedNotes);
        // Open invitation for all system agents: unassigned until an agent accepts
        appt.setAgent(null);

        ViewingAppointment saved = appointmentRepository.save(appt);

        // Observer Pattern event notification - Open invitation for all agents
        eventPublisher.publishEvent(new ApartmentSalesEvent(
                this, "OPEN_TOUR_INVITATION", buyerEmail,
                "New viewing tour requested for '" + listing.getTitle() + "' on " + dto.getAppointmentDate() + ". Open invitation dispatched to all system agents."
        ));

        return saved;
    }

    // CRUD 2: READ APPOINTMENTS
    public List<ViewingAppointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    public ViewingAppointment getAppointmentById(Long id) {
        return appointmentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found: " + id));
    }

    public List<ViewingAppointment> getMyAppointments(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getRole().name().equals("AGENT")) {
            return appointmentRepository.findByAgentOrOpen(user);
        } else if (user.getRole().name().equals("SELLER")) {
            return appointmentRepository.findByListingSeller(user);
        }
        return appointmentRepository.findByBuyer(user);
    }

    // AGENT ACCEPTS OPEN TOUR INVITATION
    public ViewingAppointment acceptAppointment(Long id, String agentEmail) {
        ViewingAppointment appt = getAppointmentById(id);
        User agent = userRepository.findByEmail(agentEmail)
                .orElseThrow(() -> new IllegalArgumentException("Agent not found: " + agentEmail));

        // Rule 1: First agent to accept becomes touring agent. Subsequent agents cannot accept if already accepted.
        if (appt.getAgent() != null) {
            if (appt.getAgent().getId().equals(agent.getId())) {
                return appt; // Already accepted by this agent
            }
            throw new IllegalStateException("This viewing tour has already been accepted by Agent "
                    + appt.getAgent().getFullName() + ". Other agents cannot accept it.");
        }

        // Rule 2: Agent capacity constraint: Only up to 3 active pending tours allowed per agent
        long activeCount = appointmentRepository.countByAgentAndStatusIn(
                agent,
                List.of(AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED)
        );
        if (activeCount >= 3) {
            throw new IllegalStateException("Capacity limit reached: You currently have " + activeCount
                    + " active pending tours. You can only hold up to 3 tours until you complete your pending ones.");
        }

        appt.setAgent(agent);
        appt.setStatus(AppointmentStatus.CONFIRMED);
        appt.setUpdatedAt(LocalDateTime.now());

        ViewingAppointment saved = appointmentRepository.save(appt);

        // Observer notification
        eventPublisher.publishEvent(new ApartmentSalesEvent(
                this, "TOUR_AGENT_ASSIGNED", appt.getBuyer().getEmail(),
                "Agent " + agent.getFullName() + " accepted your viewing tour for '" + appt.getListing().getTitle() + "' and is your assigned touring agent!"
        ));

        return saved;
    }

    // CRUD 3: UPDATE APPOINTMENT (Confirm, Reschedule, Complete)
    public ViewingAppointment updateAppointment(Long id, AppointmentDTO dto) {
        ViewingAppointment appt = getAppointmentById(id);

        // Completed tours cannot be rescheduled or modified
        if (appt.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalStateException("Completed viewing tours cannot be rescheduled or modified.");
        }

        if (dto.getAppointmentDate() != null) {
            appt.setAppointmentDate(dto.getAppointmentDate());
        }
        if (dto.getAppointmentTime() != null) {
            appt.setAppointmentTime(dto.getAppointmentTime());
        }
        if (dto.getStatus() != null) {
            appt.setStatus(dto.getStatus());
        }
        if (dto.getNotes() != null) {
            appt.setNotes(dto.getNotes());
        }
        if (dto.getAgentId() != null) {
            userRepository.findById(dto.getAgentId()).ifPresent(appt::setAgent);
        }
        appt.setUpdatedAt(LocalDateTime.now());

        ViewingAppointment updated = appointmentRepository.save(appt);

        // Observer event
        eventPublisher.publishEvent(new ApartmentSalesEvent(
                this, "VIEWING_UPDATED", appt.getBuyer().getEmail(),
                "Your viewing status updated to: " + appt.getStatus()
        ));

        return updated;
    }

    // CRUD 4: DELETE / CANCEL APPOINTMENT
    public void deleteAppointment(Long id) {
        deleteAppointment(id, false);
    }

    public void deleteAppointment(Long id, boolean isAdmin) {
        ViewingAppointment appt = getAppointmentById(id);
        if (!isAdmin && appt.getStatus() == AppointmentStatus.COMPLETED) {
            throw new IllegalStateException("Completed viewing tours cannot be cancelled or deleted.");
        }
        appointmentRepository.delete(appt);
    }

    // --- INQUIRY CRUD (UNIFIED WITH SUPPORT TICKETS) ---
    public SupportTicket submitInquiry(InquiryDTO dto, String buyerEmail) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new IllegalArgumentException("Buyer not found"));
        ApartmentListing listing = dto.getListingId() != null
                ? listingRepository.findById(dto.getListingId()).orElse(null)
                : null;

        SupportTicket inq = new SupportTicket();
        inq.setListing(listing);
        inq.setUser(buyer);
        inq.setSubject(dto.getSubject());
        inq.setMessage(dto.getMessage());
        inq.setCategory("PROPERTY_INQUIRY");
        inq.setStatus(TicketStatus.OPEN);
        inq.setPriority(TicketPriority.MEDIUM);

        SupportTicket saved = ticketRepository.save(inq);

        eventPublisher.publishEvent(new ApartmentSalesEvent(
                this, "PROPERTY_INQUIRY_SUBMITTED", buyerEmail,
                "Property Inquiry #" + saved.getId() + " submitted: " + saved.getSubject()
        ));

        return saved;
    }

    public List<SupportTicket> getAllInquiries() {
        return ticketRepository.findByCategory("PROPERTY_INQUIRY");
    }

    public List<SupportTicket> getMyInquiries(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return ticketRepository.findByUserAndCategory(user, "PROPERTY_INQUIRY");
    }

    public SupportTicket respondToInquiry(Long inquiryId, String responseText, String responderEmail) {
        SupportTicket inq = ticketRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("Inquiry not found"));

        // RULE: No one can edit inquiries after completion
        if (inq.getStatus() == TicketStatus.RESOLVED || inq.getStatus() == TicketStatus.CLOSED) {
            throw new IllegalStateException("No one can edit inquiries after completion.");
        }

        // MODULE 5.2: Require non-empty resolution comment
        if (responseText == null || responseText.trim().isEmpty()) {
            throw new IllegalArgumentException("A non-empty resolution response is required to resolve an inquiry.");
        }
        
        if (responderEmail != null) {
            User responder = userRepository.findByEmail(responderEmail).orElse(null);
            if (responder != null) {
                User author = inq.getUser();
                Role authorRole = (author != null && author.getRole() != null) ? author.getRole() : Role.BUYER;

                // RULE: If responder is Agent
                if (responder.getRole() == Role.AGENT) {
                    if (authorRole != Role.BUYER) {
                        throw new org.springframework.security.access.AccessDeniedException("Agents can only handle inquiries submitted by buyers.");
                    }
                    boolean isAlreadyReplied = inq.getResponder() != null
                            || (inq.getStaffResponse() != null && !inq.getStaffResponse().trim().isEmpty());
                    if (isAlreadyReplied) {
                        if (inq.getStatus() != TicketStatus.IN_PROGRESS) {
                            throw new IllegalStateException("Agents can only edit inquiries that are in progress.");
                        }
                        if (inq.getResponder() == null || !inq.getResponder().getId().equals(responder.getId())) {
                            throw new org.springframework.security.access.AccessDeniedException("Agents can only edit inquiries replied by themselves.");
                        }
                    } else {
                        inq.setResponder(responder);
                    }
                } else if (authorRole == Role.SELLER || authorRole == Role.AGENT) {
                    // RULE 1: If seller or agent submitted an inquiry, only SuperAdmin can reply
                    if (responder.getRole() != Role.ADMIN) {
                        throw new org.springframework.security.access.AccessDeniedException("Inquiries from Sellers or Agents can only be reviewed and replied to by Super Administrator.");
                    }
                    if (inq.getResponder() == null) {
                        inq.setResponder(responder);
                    }
                } else {
                    if (inq.getResponder() == null) {
                        inq.setResponder(responder);
                    }
                }
            }
        }

        inq.setStaffResponse(responseText.trim());
        inq.setStatus(TicketStatus.RESOLVED);
        inq.setUpdatedAt(LocalDateTime.now());
        return ticketRepository.save(inq);
    }

    public void deleteInquiry(Long inquiryId, String userEmail) {
        SupportTicket inq = ticketRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("Inquiry not found"));

        User currentUser = null;
        if (userEmail != null) {
            currentUser = userRepository.findByEmail(userEmail).orElse(null);
        }

        // RULE: Agent cannot delete any inquiries at all
        if (currentUser != null && currentUser.getRole() == Role.AGENT) {
            throw new org.springframework.security.access.AccessDeniedException("Agents are not authorized to delete inquiries.");
        }

        // RULE: No one can delete after completion
        if (inq.getStatus() == TicketStatus.RESOLVED || inq.getStatus() == TicketStatus.CLOSED) {
            throw new IllegalStateException("Inquiries cannot be deleted after completion.");
        }

        // RULE: Inquiry can be deleted only by only the one who sent it and the super admin before completion
        boolean isSuperAdmin = currentUser != null && currentUser.getRole() == Role.ADMIN;
        boolean isSender = currentUser != null && inq.getUser() != null
                && currentUser.getId().equals(inq.getUser().getId());

        if (!isSuperAdmin && !isSender) {
            throw new org.springframework.security.access.AccessDeniedException("Inquiries can only be deleted by the one who sent it or the Super Administrator before completion.");
        }

        ticketRepository.delete(inq);
    }
}
