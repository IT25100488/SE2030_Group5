package com.sliit.se2030.apartmentsales.controller;

import com.sliit.se2030.apartmentsales.model.*;
import com.sliit.se2030.apartmentsales.dto.*;
import com.sliit.se2030.apartmentsales.service.*;
import com.sliit.se2030.apartmentsales.repository.UserRepository;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN')")
public class AdminSystemController {

    private final AdminSystemReportService adminService;
    private final UserRepository userRepository;

    public AdminSystemController(AdminSystemReportService adminService, UserRepository userRepository) {
        this.adminService = adminService;
        this.userRepository = userRepository;
    }

    // --- ANNOUNCEMENTS CRUD ---
    @PostMapping("/announcements")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemAnnouncement> createAnnouncement(@Valid @RequestBody AnnouncementDTO dto) {
        return ResponseEntity.ok(adminService.createAnnouncement(dto));
    }

    @GetMapping("/announcements")
    public ResponseEntity<List<SystemAnnouncement>> getAllAnnouncements() {
        return ResponseEntity.ok(adminService.getAllAnnouncements());
    }

    @GetMapping("/announcements/public")
    @PreAuthorize("permitAll()")
    public ResponseEntity<List<SystemAnnouncement>> getPublicAnnouncements() {
        return ResponseEntity.ok(adminService.getActiveAnnouncements());
    }

    @GetMapping("/announcements/{id}")
    public ResponseEntity<SystemAnnouncement> getAnnouncementById(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getAnnouncementById(id));
    }

    @PutMapping("/announcements/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SystemAnnouncement> updateAnnouncement(
            @PathVariable Long id,
            @Valid @RequestBody AnnouncementDTO dto) {
        return ResponseEntity.ok(adminService.updateAnnouncement(id, dto));
    }

    @DeleteMapping("/announcements/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable Long id) {
        adminService.deleteAnnouncement(id);
        return ResponseEntity.ok(Map.of("message", "Announcement deleted successfully", "id", id));
    }

    // --- AUDIT LOGS CRUD ---
    @GetMapping("/audit-logs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        return ResponseEntity.ok(adminService.getRecentAuditLogs());
    }

    // MODULE 6.1: IMMUTABLE AUDIT LOGS (Strictly Append-Only)
    @DeleteMapping("/audit-logs/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteAuditLog(@PathVariable Long id) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.METHOD_NOT_ALLOWED)
                .body(Map.of(
                        "error", "Audit logs are strictly append-only and immutable for compliance and security audit trails (SOX / ISO 27001). Record deletion is prohibited.",
                        "status", 405
                ));
    }

    // --- DASHBOARD METRICS & REPORTS ---
    @GetMapping("/dashboard-stats")
    public ResponseEntity<DashboardMetricsDTO> getDashboardStats() {
        return ResponseEntity.ok(adminService.getDashboardMetrics());
    }

    // --- USER MANAGEMENT ---
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PutMapping("/users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> updateUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        Role role = Role.valueOf(body.get("role"));
        return ResponseEntity.ok(adminService.updateUserRole(id, role));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, Authentication authentication) {
        if (authentication != null) {
            User current = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (current != null && current.getId().equals(id)) {
                throw new IllegalStateException("Administrators cannot delete their own account.");
            }
        }
        adminService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully", "id", id));
    }
}
