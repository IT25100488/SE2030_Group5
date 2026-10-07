package com.sliit.se2030.apartmentsales.service;

import com.sliit.se2030.apartmentsales.model.*;
import com.sliit.se2030.apartmentsales.dto.*;
import com.sliit.se2030.apartmentsales.repository.*;
import com.sliit.se2030.apartmentsales.patterns.*;

import com.sliit.se2030.apartmentsales.repository.ApartmentListingRepository;
import com.sliit.se2030.apartmentsales.model.ListingStatus;
import com.sliit.se2030.apartmentsales.repository.ViewingAppointmentRepository;
import com.sliit.se2030.apartmentsales.model.PurchaseReservation;
import com.sliit.se2030.apartmentsales.repository.PurchaseReservationRepository;
import com.sliit.se2030.apartmentsales.model.ReservationStatus;
import com.sliit.se2030.apartmentsales.repository.SupportTicketRepository;
import com.sliit.se2030.apartmentsales.model.TicketStatus;
import com.sliit.se2030.apartmentsales.patterns.ApartmentSalesEvent;
import com.sliit.se2030.apartmentsales.patterns.DatabaseConfigHelper;
import com.sliit.se2030.apartmentsales.model.Role;
import com.sliit.se2030.apartmentsales.repository.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class AdminSystemReportService {

    private final SystemAnnouncementRepository announcementRepository;
    private final AuditLogRepository auditLogRepository;
    private final ApartmentListingRepository listingRepository;
    private final PurchaseReservationRepository reservationRepository;
    private final ViewingAppointmentRepository appointmentRepository;
    private final SupportTicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final ApplicationEventPublisher eventPublisher;

    public AdminSystemReportService(SystemAnnouncementRepository announcementRepository,
                                    AuditLogRepository auditLogRepository,
                                    ApartmentListingRepository listingRepository,
                                    PurchaseReservationRepository reservationRepository,
                                    ViewingAppointmentRepository appointmentRepository,
                                    SupportTicketRepository ticketRepository,
                                    UserRepository userRepository,
                                    UserService userService,
                                    ApplicationEventPublisher eventPublisher) {
        this.announcementRepository = announcementRepository;
        this.auditLogRepository = auditLogRepository;
        this.listingRepository = listingRepository;
        this.reservationRepository = reservationRepository;
        this.appointmentRepository = appointmentRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.eventPublisher = eventPublisher;
    }

    // CRUD 1: CREATE ANNOUNCEMENT
    public SystemAnnouncement createAnnouncement(AnnouncementDTO dto) {
        SystemAnnouncement announcement = new SystemAnnouncement();
        announcement.setTitle(dto.getTitle());
        announcement.setContent(dto.getContent());
        announcement.setTargetRole(dto.getTargetRole() != null ? dto.getTargetRole() : "ALL");
        announcement.setPriority(dto.getPriority() != null ? dto.getPriority() : "INFO");
        announcement.setActive(dto.isActive());

        SystemAnnouncement saved = announcementRepository.save(announcement);

        // Observer Event — this now also writes the AuditLog entry (see
        // ApartmentEventSubscriber), so we no longer log it a second time here.
        eventPublisher.publishEvent(new ApartmentSalesEvent(
                this, "ANNOUNCEMENT_BROADCAST", "ALL_USERS",
                "New Announcement: " + saved.getTitle()
        ));

        return saved;
    }

    // CRUD 2: READ ANNOUNCEMENTS
    public List<SystemAnnouncement> getAllAnnouncements() {
        return announcementRepository.findAll();
    }

    public List<SystemAnnouncement> getActiveAnnouncements() {
        return announcementRepository.findByActiveTrue();
    }

    public SystemAnnouncement getAnnouncementById(Long id) {
        return announcementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found: " + id));
    }

    // CRUD 3: UPDATE ANNOUNCEMENT
    public SystemAnnouncement updateAnnouncement(Long id, AnnouncementDTO dto) {
        SystemAnnouncement ann = getAnnouncementById(id);
        ann.setTitle(dto.getTitle());
        ann.setContent(dto.getContent());
        if (dto.getTargetRole() != null) ann.setTargetRole(dto.getTargetRole());
        if (dto.getPriority() != null) ann.setPriority(dto.getPriority());
        ann.setActive(dto.isActive());

        logActivity("admin@gmail.com", "UPDATE_ANNOUNCEMENT", "MODULE_6_ADMIN", "Updated announcement ID: " + id);

        return announcementRepository.save(ann);
    }

    // CRUD 4: DELETE ANNOUNCEMENT
    public void deleteAnnouncement(Long id) {
        SystemAnnouncement ann = getAnnouncementById(id);
        announcementRepository.delete(ann);
        logActivity("admin@gmail.com", "DELETE_ANNOUNCEMENT", "MODULE_6_ADMIN", "Deleted announcement ID: " + id);
    }

    // AUDIT LOGGING (CRUD)
    public void logActivity(String actorEmail, String action, String module, String details) {
        AuditLog log = new AuditLog(actorEmail, action, module, details);
        auditLogRepository.save(log);
    }

    public List<AuditLog> getRecentAuditLogs() {
        return auditLogRepository.findTop50ByOrderByTimestampDesc();
    }

    // MODULE 6.1: IMMUTABLE AUDIT LOGS (Strictly Append-Only)
    public void deleteAuditLog(Long id) {
        throw new UnsupportedOperationException("Audit logs are strictly append-only and immutable for compliance and regulatory security standards (SOX / ISO 27001). Deletion of audit records is strictly prohibited.");
    }

    // DASHBOARD & ANALYTICS REPORTING
    public DashboardMetricsDTO getDashboardMetrics() {
        DashboardMetricsDTO dto = new DashboardMetricsDTO();

        long totalListings = listingRepository.count();
        long available = listingRepository.findByStatus(ListingStatus.AVAILABLE).size();
        long reserved = listingRepository.findByStatus(ListingStatus.RESERVED).size();
        long sold = listingRepository.findByStatus(ListingStatus.SOLD).size();

        dto.setTotalListings(totalListings);
        dto.setAvailableListings(available);
        dto.setReservedListings(reserved);
        dto.setSoldListings(sold);

        double inventoryValue = listingRepository.findAll().stream()
                .mapToDouble(ApartmentListing::getPrice)
                .sum();
        dto.setTotalInventoryValue(inventoryValue);

        dto.setTotalUsers(userRepository.count());
        dto.setTotalAppointments(appointmentRepository.count());

        List<PurchaseReservation> transactions = reservationRepository.findAll();
        dto.setTotalTransactions(transactions.size());

        double revenue = transactions.stream()
                .filter(t -> t.getStatus() == ReservationStatus.CONFIRMED || t.getStatus() == ReservationStatus.PAYMENT_RECEIVED || t.getStatus() == ReservationStatus.COMPLETED)
                .mapToDouble(PurchaseReservation::getDepositAmount)
                .sum();
        dto.setTotalRevenue(revenue);

        dto.setOpenSupportTickets(ticketRepository.findByStatus(TicketStatus.OPEN).size());

        Map<String, Long> roleMap = new HashMap<>();
        for (Role role : Role.values()) {
            roleMap.put(role.name(), (long) userRepository.findByRole(role).size());
        }
        dto.setUsersByRole(roleMap);

        return dto;
    }

    // --- USER MANAGEMENT (CRUD for Admin) ---
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User updateUserRole(Long userId, Role role) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        user.setRole(role);
        logActivity("admin@gmail.com", "UPDATE_USER_ROLE", "MODULE_6_ADMIN", "Updated user " + user.getEmail() + " role to " + role);
        return userRepository.save(user);
    }

    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        if ("admin@gmail.com".equalsIgnoreCase(user.getEmail())) {
            throw new IllegalStateException("The Main Administrator account cannot be deleted.");
        }
        String userEmail = user.getEmail();
        userService.deleteUserById(userId);
        logActivity("admin@gmail.com", "DELETE_USER", "MODULE_6_ADMIN", "Deleted user: " + userEmail);
    }
}
