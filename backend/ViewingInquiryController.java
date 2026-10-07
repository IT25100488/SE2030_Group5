package com.sliit.se2030.apartmentsales.controller;

import com.sliit.se2030.apartmentsales.model.*;
import com.sliit.se2030.apartmentsales.dto.*;
import com.sliit.se2030.apartmentsales.service.*;
import com.sliit.se2030.apartmentsales.repository.UserRepository;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ViewingInquiryController {

    private final ViewingInquiryService viewingInquiryService;
    private final UserRepository userRepository;

    public ViewingInquiryController(ViewingInquiryService viewingInquiryService, UserRepository userRepository) {
        this.viewingInquiryService = viewingInquiryService;
        this.userRepository = userRepository;
    }

    // --- APPOINTMENTS CRUD ---
    @PostMapping("/appointments")
    public ResponseEntity<ViewingAppointment> createAppointment(
            @Valid @RequestBody AppointmentDTO dto,
            Authentication authentication) {
        return ResponseEntity.ok(viewingInquiryService.createAppointment(dto, authentication.getName()));
    }

    @GetMapping("/appointments")
    public ResponseEntity<List<ViewingAppointment>> getAllAppointments(Authentication authentication) {
        if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_BUYER") || a.getAuthority().equals("ROLE_SELLER") || a.getAuthority().equals("ROLE_AGENT"))) {
            return ResponseEntity.ok(viewingInquiryService.getMyAppointments(authentication.getName()));
        }
        return ResponseEntity.ok(viewingInquiryService.getAllAppointments());
    }

    @GetMapping("/appointments/{id}")
    public ResponseEntity<ViewingAppointment> getAppointmentById(@PathVariable Long id, Authentication authentication) {
        ViewingAppointment appt = viewingInquiryService.getAppointmentById(id);
        if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_BUYER"))) {
            if (!appt.getBuyer().getEmail().equalsIgnoreCase(authentication.getName())) {
                throw new IllegalArgumentException("Access Denied: You can only view your own viewing tour appointments.");
            }
        }
        return ResponseEntity.ok(appt);
    }

    @GetMapping("/appointments/my")
    public ResponseEntity<List<ViewingAppointment>> getMyAppointments(Authentication authentication) {
        return ResponseEntity.ok(viewingInquiryService.getMyAppointments(authentication.getName()));
    }

        @PutMapping("/appointments/{id}")
    public ResponseEntity<ViewingAppointment> updateAppointment(
            @PathVariable Long id,
            @RequestBody AppointmentDTO dto,
            Authentication authentication) {
        ViewingAppointment appt = viewingInquiryService.getAppointmentById(id);
        if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_BUYER"))) {
            if (!appt.getBuyer().getEmail().equalsIgnoreCase(authentication.getName())) {
                throw new IllegalArgumentException("Access Denied: You can only reschedule your own viewing appointment.");
            }
            // 👈 Prevent Buyer from overriding the status (only Agents/Admins can confirm/complete)
            dto.setStatus(appt.getStatus());
        }
        if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_AGENT"))) {
            if (appt.getAgent() != null && !appt.getAgent().getEmail().equalsIgnoreCase(authentication.getName())) {
                throw new IllegalArgumentException("Access Denied: You cannot modify a viewing tour assigned to another agent.");
            }
            if (appt.getAgent() == null) {
                userRepository.findByEmail(authentication.getName()).ifPresent(ag -> dto.setAgentId(ag.getId()));
            }
        }
        return ResponseEntity.ok(viewingInquiryService.updateAppointment(id, dto));
    }

    @PutMapping("/appointments/{id}/accept")
    public ResponseEntity<ViewingAppointment> acceptAppointment(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(viewingInquiryService.acceptAppointment(id, authentication.getName()));
    }


    @DeleteMapping("/appointments/{id}")
    public ResponseEntity<?> deleteAppointment(@PathVariable Long id, Authentication authentication) {
        ViewingAppointment appt = viewingInquiryService.getAppointmentById(id);
        boolean isAdmin = authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_FINANCE_ADMIN"));

        if (!isAdmin && authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_BUYER"))) {
            if (!appt.getBuyer().getEmail().equalsIgnoreCase(authentication.getName())) {
                throw new IllegalArgumentException("Access Denied: You can only cancel your own viewing appointment.");
            }
        }
        if (!isAdmin && authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_AGENT"))) {
            throw new IllegalArgumentException("Access Denied: Real estate agents cannot cancel or delete viewing tours once accepted/assigned. Please contact an administrator or complete the tour.");
        }
        viewingInquiryService.deleteAppointment(id, isAdmin);
        return ResponseEntity.ok(Map.of("message", "Appointment cancelled successfully", "id", id));
    }

    // --- INQUIRIES CRUD ---
    @PostMapping("/inquiries")
    public ResponseEntity<SupportTicket> submitInquiry(
            @Valid @RequestBody InquiryDTO dto,
            Authentication authentication) {
        return ResponseEntity.ok(viewingInquiryService.submitInquiry(dto, authentication.getName()));
    }

    @GetMapping("/inquiries")
    public ResponseEntity<List<SupportTicket>> getAllInquiries(Authentication authentication) {
        if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_BUYER"))) {
            return ResponseEntity.ok(viewingInquiryService.getMyInquiries(authentication.getName()));
        }
        return ResponseEntity.ok(viewingInquiryService.getAllInquiries());
    }

    @GetMapping("/inquiries/my")
    public ResponseEntity<List<SupportTicket>> getMyInquiries(Authentication authentication) {
        return ResponseEntity.ok(viewingInquiryService.getMyInquiries(authentication.getName()));
    }

    @PutMapping("/inquiries/{id}/reply")
    public ResponseEntity<SupportTicket> replyToInquiry(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        return ResponseEntity.ok(viewingInquiryService.respondToInquiry(id, body.get("response"), authentication != null ? authentication.getName() : null));
    }

    @DeleteMapping("/inquiries/{id}")
    public ResponseEntity<?> deleteInquiry(@PathVariable Long id, Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        viewingInquiryService.deleteInquiry(id, userEmail);
        return ResponseEntity.ok(Map.of("message", "Inquiry deleted successfully", "id", id));
    }
}
