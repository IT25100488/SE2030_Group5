package com.sliit.se2030.apartmentsales.service;

import com.sliit.se2030.apartmentsales.model.*;
import com.sliit.se2030.apartmentsales.dto.*;
import com.sliit.se2030.apartmentsales.repository.*;
import com.sliit.se2030.apartmentsales.patterns.*;

import com.sliit.se2030.apartmentsales.model.ApartmentListing;
import com.sliit.se2030.apartmentsales.repository.ApartmentListingRepository;
import com.sliit.se2030.apartmentsales.patterns.ApartmentSalesEvent;
import com.sliit.se2030.apartmentsales.model.Role;
import com.sliit.se2030.apartmentsales.model.User;
import com.sliit.se2030.apartmentsales.repository.UserRepository;
import com.sliit.se2030.apartmentsales.repository.ViewingAppointmentRepository;
import com.sliit.se2030.apartmentsales.model.AppointmentStatus;
import com.sliit.se2030.apartmentsales.repository.PurchaseReservationRepository;
import com.sliit.se2030.apartmentsales.model.ReservationStatus;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;


@Service
@Transactional
public class SupportReviewService {

    private final SupportTicketRepository ticketRepository;
    private final ApartmentReviewRepository reviewRepository;
    private final ApartmentListingRepository listingRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final ViewingAppointmentRepository viewingAppointmentRepository;
    private final PurchaseReservationRepository purchaseReservationRepository;

    public SupportReviewService(SupportTicketRepository ticketRepository,
                                ApartmentReviewRepository reviewRepository,
                                ApartmentListingRepository listingRepository,
                                UserRepository userRepository,
                                ApplicationEventPublisher eventPublisher,
                                ViewingAppointmentRepository viewingAppointmentRepository,
                                PurchaseReservationRepository purchaseReservationRepository) {
        this.ticketRepository = ticketRepository;
        this.reviewRepository = reviewRepository;
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
        this.viewingAppointmentRepository = viewingAppointmentRepository;
        this.purchaseReservationRepository = purchaseReservationRepository;
    }

    // CRUD 1: CREATE TICKET
    public SupportTicket createTicket(SupportTicketDTO dto, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail));

        SupportTicket ticket = new SupportTicket();
        ticket.setUser(user);
        ticket.setSubject(dto.getSubject());
        ticket.setCategory(dto.getCategory());
        ticket.setPriority(dto.getPriority() != null ? dto.getPriority() : TicketPriority.MEDIUM);
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setMessage(dto.getMessage());

        if (dto.getListingId() != null) {
            ApartmentListing listing = listingRepository.findById(dto.getListingId()).orElse(null);
            ticket.setListing(listing);
        }

        SupportTicket saved = ticketRepository.save(ticket);

        // Observer Event
        eventPublisher.publishEvent(new ApartmentSalesEvent(
                this, "SUPPORT_TICKET_OPENED", userEmail,
                "Support Ticket #" + saved.getId() + " opened: " + saved.getSubject()
        ));

        return saved;
    }

    // CRUD 2: READ TICKETS (Role-Based Routing)
    public List<SupportTicket> getAllTickets(String userEmail) {
        if (userEmail == null) {
            return ticketRepository.findAll();
        }
        User currentUser = userRepository.findByEmail(userEmail).orElse(null);
        if (currentUser == null) {
            return ticketRepository.findAll();
        }

        // Super Admin (ADMIN): Oversight of all inquiries, specifically seller and agent inquiries
        if (currentUser.getRole() == Role.ADMIN) {
            return ticketRepository.findAll();
        }

        // Customer Support Admin (SUPPORT_ADMIN):
        // If a buyer submits an inquiry, it directly goes to Customer Support dashboard (view and reply)
        // Seller and Agent inquiries are strictly excluded
        if (currentUser.getRole() == Role.SUPPORT_ADMIN) {
            return ticketRepository.findAll().stream()
                    .filter(t -> t.getUser() != null && t.getUser().getRole() == Role.BUYER)
                    .collect(Collectors.toList());
        }

        // Agent (AGENT):
        // Agents can view buyer inquiries (to reply if unreplied) and their own submitted inquiries (to see Super Admin's reply)
        if (currentUser.getRole() == Role.AGENT) {
            return ticketRepository.findAll().stream()
                    .filter(t -> t.getUser() != null && (t.getUser().getRole() == Role.BUYER || t.getUser().getId().equals(currentUser.getId())))
                    .collect(Collectors.toList());
        }

        // Finance Admin (FINANCE_ADMIN): Does not manage customer support inquiries
        if (currentUser.getRole() == Role.FINANCE_ADMIN) {
            return Collections.emptyList();
        }

        // Sellers and Buyers only see their own inquiries
        return ticketRepository.findByUser(currentUser);
    }

    public List<SupportTicket> getAllTickets() {
        return getAllTickets(null);
    }

    public SupportTicket getTicketById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Support Ticket not found: " + id));
    }

    public List<SupportTicket> getMyTickets(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        return ticketRepository.findByUser(user);
    }

    // CRUD 3: UPDATE TICKET (Respond / Update Status)
    public SupportTicket updateTicket(Long id, SupportTicketDTO dto, String userEmail) {
        SupportTicket ticket = getTicketById(id);
        User currentUser = null;
        if (userEmail != null) {
            currentUser = userRepository.findByEmail(userEmail).orElse(null);
        }

        // RULE: No one can edit inquiries after COMPLETED
        if (ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED) {
            throw new IllegalStateException("No one can edit inquiries after completion.");
        }

        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to update support tickets.");
        }

        User author = ticket.getUser();
        Role authorRole = (author != null && author.getRole() != null) ? author.getRole() : Role.BUYER;
        boolean isAuthor = currentUser != null && author != null && currentUser.getId().equals(author.getId());

        // 1. Author editing their own inquiry (e.g. Agent, Seller, or Buyer editing their inquiry to Super Admin)
        if (isAuthor) {
            if (dto.getSubject() != null) ticket.setSubject(dto.getSubject());
            if (dto.getCategory() != null) ticket.setCategory(dto.getCategory());
            if (dto.getPriority() != null) ticket.setPriority(dto.getPriority());
            if (dto.getMessage() != null) ticket.setMessage(dto.getMessage());
            if (dto.getListingId() != null) {
                ApartmentListing listing = listingRepository.findById(dto.getListingId()).orElse(null);
                ticket.setListing(listing);
            }
            ticket.setUpdatedAt(LocalDateTime.now());
            return ticketRepository.save(ticket);
        }

        // 2. Agent can edit inquiries submitted by buyers (with or without previous acceptance)
        if (currentUser.getRole() == Role.AGENT) {
            if (authorRole != Role.BUYER) {
                throw new AccessDeniedException("Agents can only edit inquiries submitted by buyers, or inquiries submitted by themselves to the Super Admin.");
            }

            // Assign or update responder to this agent
            ticket.setResponder(currentUser);

            // MODULE 5.2: Support tickets cannot be resolved or closed without a non-empty administrative resolution comment
            if (dto.getStatus() == TicketStatus.RESOLVED || dto.getStatus() == TicketStatus.CLOSED) {
                String resolutionComment = dto.getStaffResponse() != null ? dto.getStaffResponse().trim() : (ticket.getStaffResponse() != null ? ticket.getStaffResponse().trim() : "");
                if (resolutionComment.isEmpty()) {
                    throw new IllegalArgumentException("A non-empty administrative resolution comment is required to resolve or close a support ticket.");
                }
            }

            if (dto.getStaffResponse() != null) {
                ticket.setStaffResponse(dto.getStaffResponse());
            }

            if (dto.getStatus() == TicketStatus.RESOLVED || dto.getStatus() == TicketStatus.CLOSED) {
                ticket.setStatus(dto.getStatus());
            } else {
                // In-progress option attached: inquiry stays/transitions to IN_PROGRESS until completed
                ticket.setStatus(TicketStatus.IN_PROGRESS);
            }

            ticket.setUpdatedAt(LocalDateTime.now());
            return ticketRepository.save(ticket);
        }

        // 3. Staff response / Status transitions for Super Admin or Support Admin
        boolean isStaffAction = (dto.getStaffResponse() != null && !dto.getStaffResponse().trim().isEmpty())
                || dto.getStatus() == TicketStatus.IN_PROGRESS
                || dto.getStatus() == TicketStatus.RESOLVED
                || dto.getStatus() == TicketStatus.CLOSED;

        if (isStaffAction) {
            // RULE 1: If seller or agent submitted an inquiry, it goes ONLY for SuperAdmin (view and reply)
            if (authorRole == Role.SELLER || authorRole == Role.AGENT) {
                if (currentUser.getRole() != Role.ADMIN) {
                    throw new AccessDeniedException("Inquiries from Sellers or Agents can only be reviewed and replied to by Super Administrator.");
                }
            }

            // RULE 2: If buyer submitted an inquiry, Customer Support Admin or Super Admin can respond
            if (authorRole == Role.BUYER) {
                if (currentUser.getRole() != Role.ADMIN && currentUser.getRole() != Role.SUPPORT_ADMIN) {
                    throw new AccessDeniedException("Only Customer Support Administrators or Super Administrators can respond to buyer inquiries.");
                }
            }

            // MODULE 5.2: Support tickets cannot be resolved or closed without a non-empty administrative resolution comment
            if (dto.getStatus() == TicketStatus.RESOLVED || dto.getStatus() == TicketStatus.CLOSED) {
                String resolutionComment = dto.getStaffResponse() != null ? dto.getStaffResponse().trim() : (ticket.getStaffResponse() != null ? ticket.getStaffResponse().trim() : "");
                if (resolutionComment.isEmpty()) {
                    throw new IllegalArgumentException("A non-empty administrative resolution comment is required to resolve or close a support ticket.");
                }
            }

            // If ticket has NO assigned responder yet, this member claims it
            if (ticket.getResponder() == null) {
                ticket.setResponder(currentUser);
            } else {
                // If ticket is already claimed by a responder, ONLY that responder or SuperAdmin can edit it
                if (!ticket.getResponder().getId().equals(currentUser.getId()) && currentUser.getRole() != Role.ADMIN) {
                    String responderName = ticket.getResponder().getFullName();
                    String responderRole = ticket.getResponder().getRole() != null ? ticket.getResponder().getRole().name() : "Staff";
                    throw new AccessDeniedException("This ticket is assigned to " + responderName + " (" + responderRole + "). Only the assigned responder can edit or update this ticket.");
                }
            }

            if (dto.getStaffResponse() != null) {
                ticket.setStaffResponse(dto.getStaffResponse());
            }

            if (dto.getStatus() != null) {
                ticket.setStatus(dto.getStatus());
            } else if (ticket.getStatus() == TicketStatus.OPEN) {
                ticket.setStatus(TicketStatus.IN_PROGRESS);
            }
        } else {
            // Client / author updating their own open inquiry (before completion)
            if (ticket.getUser() == null || !ticket.getUser().getId().equals(currentUser.getId())) {
                throw new AccessDeniedException("You do not have permission to edit this inquiry.");
            }
            if (dto.getSubject() != null) ticket.setSubject(dto.getSubject());
            if (dto.getCategory() != null) ticket.setCategory(dto.getCategory());
            if (dto.getPriority() != null) ticket.setPriority(dto.getPriority());
            if (dto.getMessage() != null) ticket.setMessage(dto.getMessage());
            if (dto.getStatus() != null) ticket.setStatus(dto.getStatus());
            if (dto.getListingId() != null) {
                ApartmentListing listing = listingRepository.findById(dto.getListingId()).orElse(null);
                ticket.setListing(listing);
            }
        }

        ticket.setUpdatedAt(LocalDateTime.now());
        return ticketRepository.save(ticket);
    }

    // CRUD 4: DELETE TICKET
    public void deleteTicket(Long id, String userEmail) {
        SupportTicket ticket = getTicketById(id);
        User currentUser = null;
        if (userEmail != null) {
            currentUser = userRepository.findByEmail(userEmail).orElse(null);
        }

        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to delete support tickets.");
        }

        // RULE: No one can delete after completion
        if (ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CLOSED) {
            throw new IllegalStateException("Inquiries cannot be deleted after completion.");
        }

        boolean isSuperAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isSender = ticket.getUser() != null && currentUser.getId().equals(ticket.getUser().getId());

        // TERM 1: When buyer submitted an inquiry, agents cannot delete their inquiries with or without accepting the ticket
        if (currentUser.getRole() == Role.AGENT && !isSender) {
            throw new AccessDeniedException("Access Denied: Agents cannot delete inquiries submitted by buyers with or without accepting the ticket.");
        }

        // TERM 2: If an agent put an inquiry, he can delete his inquiry by himself only
        if (!isSuperAdmin && !isSender) {
            throw new AccessDeniedException("Inquiries can only be deleted by the one who sent it or the Super Administrator before completion.");
        }

        ticketRepository.delete(ticket);
    }

    // --- REVIEWS CRUD & ELIGIBILITY ---
    public ApartmentReview createReview(ReviewDTO dto, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        ApartmentListing listing = listingRepository.findById(dto.getListingId())
                .orElseThrow(() -> new IllegalArgumentException("Listing not found"));

        if (user.getRole() != Role.BUYER) {
            throw new AccessDeniedException("Only buyers can leave reviews.");
        }

        boolean hasCompletedViewing = viewingAppointmentRepository.existsByBuyerAndListingAndStatus(user, listing, AppointmentStatus.COMPLETED);

        if (!hasCompletedViewing) {
            throw new IllegalStateException("Only buyers who have completed a viewing tour for this apartment can leave a review.");
        }

        boolean alreadyReviewed = reviewRepository.findByListing(listing).stream()
                .anyMatch(r -> r.getUser().getId().equals(user.getId()));
        if (alreadyReviewed) {
            throw new IllegalStateException("You have already reviewed this apartment. You can edit or delete your existing review.");
        }

        ApartmentReview review = new ApartmentReview();
        review.setUser(user);
        review.setListing(listing);
        review.setRating(dto.getRating());
        review.setComment(dto.getComment());

        return reviewRepository.save(review);
    }

    public List<ApartmentReview> getAllReviews() {
        return reviewRepository.findAll(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
    }

    public List<ApartmentReview> getReviewsForListing(Long listingId) {
        ApartmentListing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found"));
        return reviewRepository.findByListing(listing);
    }

    public ApartmentReview updateReview(Long reviewId, ReviewDTO dto, String userEmail) {
        ApartmentReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));

        User currentUser = null;
        if (userEmail != null) {
            currentUser = userRepository.findByEmail(userEmail).orElse(null);
        }
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to update review.");
        }

        // MODULE 5.1: Zero Review Tampering by Sellers/Agents
        if (currentUser.getRole() == Role.SELLER || currentUser.getRole() == Role.AGENT) {
            throw new AccessDeniedException("Anti-Tampering Policy: Property sellers and agents are strictly forbidden from editing buyer reviews.");
        }

        if (!currentUser.getId().equals(review.getUser().getId()) && currentUser.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only the resident who wrote this review can edit it.");
        }

        review.setRating(dto.getRating());
        review.setComment(dto.getComment());
        return reviewRepository.save(review);
    }

    public void deleteReview(Long reviewId, String userEmail) {
        ApartmentReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found"));

        User currentUser = null;
        if (userEmail != null) {
            currentUser = userRepository.findByEmail(userEmail).orElse(null);
        }
        if (currentUser == null) {
            throw new AccessDeniedException("Authentication required to delete review.");
        }

        // MODULE 5.1: Zero Review Tampering by Sellers/Agents
        if (currentUser.getRole() == Role.SELLER || currentUser.getRole() == Role.AGENT) {
            throw new AccessDeniedException("Anti-Tampering Policy: Property sellers and agents are strictly forbidden from deleting buyer reviews.");
        }

        if (!currentUser.getId().equals(review.getUser().getId()) 
                && currentUser.getRole() != Role.ADMIN 
                && currentUser.getRole() != Role.SUPPORT_ADMIN) {
            throw new AccessDeniedException("Only the resident who wrote this review or an administrator can delete it.");
        }

        reviewRepository.delete(review);
    }

    public Map<String, Object> checkEligibility(Long listingId, String userEmail) {
        if (userEmail == null) {
            return Map.of(
                    "canReview", false,
                    "hasReserved", false,
                    "hasCompletedViewing", false,
                    "hasReviewed", false,
                    "reason", "Sign in as a verified buyer who completed a viewing tour or reserved this apartment to leave a review."
            );
        }

        User user = userRepository.findByEmail(userEmail).orElse(null);
        if (user == null || user.getRole() != Role.BUYER) {
            return Map.of(
                    "canReview", false,
                    "hasReserved", false,
                    "hasCompletedViewing", false,
                    "hasReviewed", false,
                    "reason", "Only registered buyers who completed a viewing tour or reserved this residence can review it."
            );
        }

        ApartmentListing listing = listingRepository.findById(listingId).orElse(null);
        if (listing == null) {
            return Map.of(
                    "canReview", false,
                    "hasReserved", false,
                    "hasCompletedViewing", false,
                    "hasReviewed", false,
                    "reason", "Listing not found."
            );
        }

        boolean hasCompletedViewing = viewingAppointmentRepository.existsByBuyerAndListingAndStatus(user, listing, AppointmentStatus.COMPLETED);

        Optional<ApartmentReview> existingReview = reviewRepository.findByListing(listing).stream()
                .filter(r -> r.getUser().getId().equals(user.getId()))
                .findFirst();

        if (existingReview.isPresent()) {
            return Map.of(
                    "canReview", false,
                    "hasCompletedViewing", hasCompletedViewing,
                    "hasReviewed", true,
                    "existingReviewId", existingReview.get().getId(),
                    "reason", "You have already reviewed this residence. You can edit or delete your review above."
            );
        }

        if (!hasCompletedViewing) {
            return Map.of(
                    "canReview", false,
                    "hasCompletedViewing", false,
                    "hasReviewed", false,
                    "reason", "Only buyers who have completed a viewing tour for this apartment can write reviews."
            );
        }

        String reason = "You completed an on-site viewing tour of this residence and are eligible to write a review!";

        return Map.of(
                "canReview", true,
                "hasCompletedViewing", hasCompletedViewing,
                "hasReviewed", false,
                "reason", reason
        );
    }
}
