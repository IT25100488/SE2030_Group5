package com.sliit.se2030.apartmentsales.controller;

import com.sliit.se2030.apartmentsales.model.*;
import com.sliit.se2030.apartmentsales.dto.*;
import com.sliit.se2030.apartmentsales.service.*;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api")
public class SupportReviewController {

    private final SupportReviewService supportReviewService;

    public SupportReviewController(SupportReviewService supportReviewService) {
        this.supportReviewService = supportReviewService;
    }

    // --- SUPPORT TICKETS CRUD ---
    @PostMapping("/support/tickets")
    public ResponseEntity<SupportTicket> createTicket(
            @Valid @RequestBody SupportTicketDTO dto,
            Authentication authentication) {
        return ResponseEntity.ok(supportReviewService.createTicket(dto, authentication.getName()));
    }

    @GetMapping("/support/tickets")
    public ResponseEntity<List<SupportTicket>> getAllTickets(Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(supportReviewService.getAllTickets(userEmail));
    }

    @GetMapping("/support/tickets/{id}")
    public ResponseEntity<SupportTicket> getTicketById(@PathVariable Long id) {
        return ResponseEntity.ok(supportReviewService.getTicketById(id));
    }

    @GetMapping("/support/tickets/my")
    public ResponseEntity<List<SupportTicket>> getMyTickets(Authentication authentication) {
        return ResponseEntity.ok(supportReviewService.getMyTickets(authentication.getName()));
    }

    @PutMapping("/support/tickets/{id}")
    public ResponseEntity<SupportTicket> updateTicket(
            @PathVariable Long id,
            @RequestBody SupportTicketDTO dto,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(supportReviewService.updateTicket(id, dto, userEmail));
    }

    @DeleteMapping("/support/tickets/{id}")
    public ResponseEntity<?> deleteTicket(
            @PathVariable Long id,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        supportReviewService.deleteTicket(id, userEmail);
        return ResponseEntity.ok(Map.of("message", "Ticket deleted successfully", "id", id));
    }

    // --- REVIEWS CRUD & ELIGIBILITY ---
    @PostMapping("/reviews")
    public ResponseEntity<ApartmentReview> createReview(
            @Valid @RequestBody ReviewDTO dto,
            Authentication authentication) {
        return ResponseEntity.ok(supportReviewService.createReview(dto, authentication.getName()));
    }

    @GetMapping("/reviews")
    public ResponseEntity<List<ApartmentReview>> getAllReviews() {
        return ResponseEntity.ok(supportReviewService.getAllReviews());
    }

    @GetMapping("/reviews/listing/{listingId}")
    public ResponseEntity<List<ApartmentReview>> getReviewsForListing(@PathVariable Long listingId) {
        return ResponseEntity.ok(supportReviewService.getReviewsForListing(listingId));
    }

    @GetMapping("/reviews/eligibility/{listingId}")
    public ResponseEntity<?> checkReviewEligibility(
            @PathVariable Long listingId,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(supportReviewService.checkEligibility(listingId, userEmail));
    }

    @PutMapping("/reviews/{id}")
    public ResponseEntity<ApartmentReview> updateReview(
            @PathVariable Long id,
            @RequestBody ReviewDTO dto,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(supportReviewService.updateReview(id, dto, userEmail));
    }

    @DeleteMapping("/reviews/{id}")
    public ResponseEntity<?> deleteReview(
            @PathVariable Long id,
            Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        supportReviewService.deleteReview(id, userEmail);
        return ResponseEntity.ok(Map.of("message", "Review deleted successfully", "id", id));
    }
}
