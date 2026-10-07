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
@RequestMapping("/api/listings")
public class ApartmentListingController {

    private final ApartmentListingService listingService;

    public ApartmentListingController(ApartmentListingService listingService) {
        this.listingService = listingService;
    }

    // CRUD: CREATE
    @PostMapping
    public ResponseEntity<ApartmentListing> createListing(@Valid @RequestBody ApartmentListingDTO dto,
                                                          Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : "seller@example.com";
        ApartmentListing created = listingService.createListing(dto, userEmail);
        return ResponseEntity.ok(created);
    }

    // CRUD: READ ALL
    @GetMapping
    public ResponseEntity<List<ApartmentListing>> getAllListings() {
        return ResponseEntity.ok(listingService.getAllListings());
    }

    // CRUD: READ PUBLIC AVAILABLE
    @GetMapping("/public")
    public ResponseEntity<List<ApartmentListing>> getPublicListings() {
        return ResponseEntity.ok(listingService.getAvailableListings());
    }

    // CRUD: READ BY ID
    @GetMapping("/{id}")
    public ResponseEntity<ApartmentListing> getListingById(@PathVariable Long id) {
        return ResponseEntity.ok(listingService.getListingById(id));
    }

    // CRUD: READ CURRENT USER'S LISTINGS
    @GetMapping("/my-listings")
    public ResponseEntity<List<ApartmentListing>> getMyListings(Authentication authentication) {
        return ResponseEntity.ok(listingService.getMyListings(authentication.getName()));
    }

    // CRUD: UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<ApartmentListing> updateListing(@PathVariable Long id,
                                                          @Valid @RequestBody ApartmentListingDTO dto,
                                                          Authentication authentication) {
        return ResponseEntity.ok(listingService.updateListing(id, dto, authentication.getName()));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApartmentListing> updateStatus(@PathVariable Long id,
                                                         @RequestBody Map<String, String> body,
                                                         Authentication authentication) {
        String statusStr = body != null ? body.get("status") : null;
        if (statusStr == null || statusStr.isBlank()) {
            throw new IllegalArgumentException("Listing status is required");
        }
        ListingStatus status = ListingStatus.valueOf(statusStr.toUpperCase().trim());
        String userEmail = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(listingService.updateListingStatus(id, status, userEmail));
    }

    // CRUD: DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteListing(@PathVariable Long id, Authentication authentication) {
        String userEmail = authentication != null ? authentication.getName() : null;
        listingService.deleteListing(id, userEmail);
        return ResponseEntity.ok(Map.of("message", "Listing deleted successfully", "id", id));
    }
}
