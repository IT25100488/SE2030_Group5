package com.sliit.se2030.apartmentsales.controller;

import com.sliit.se2030.apartmentsales.model.*;
import com.sliit.se2030.apartmentsales.dto.*;
import com.sliit.se2030.apartmentsales.service.*;

import com.sliit.se2030.apartmentsales.model.ApartmentListing;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
public class PropertySearchController {

    private final PropertySearchService searchService;

    public PropertySearchController(PropertySearchService searchService) {
        this.searchService = searchService;
    }

    // SEARCH DISCOVERY ENDPOINT
    @GetMapping
    public ResponseEntity<List<ApartmentListing>> searchProperties(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Integer bedrooms,
            @RequestParam(required = false) String propertyType) {
        return ResponseEntity.ok(searchService.search(keyword, city, minPrice, maxPrice, bedrooms, propertyType));
    }

    // CRUD: CREATE SAVED SEARCH
    @PostMapping("/saved")
    public ResponseEntity<SavedSearchPreference> createSavedSearch(
            @Valid @RequestBody SavedSearchDTO dto,
            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalArgumentException("Authentication required to save search preferences.");
        }
        return ResponseEntity.ok(searchService.createSavedSearch(dto, authentication.getName()));
    }

    // CRUD: READ SAVED SEARCHES
    @GetMapping("/saved")
    public ResponseEntity<List<SavedSearchPreference>> getMySavedSearches(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalArgumentException("Authentication required to retrieve saved searches.");
        }
        return ResponseEntity.ok(searchService.getMySavedSearches(authentication.getName()));
    }

    @GetMapping("/saved/{id}")
    public ResponseEntity<SavedSearchPreference> getSavedSearchById(@PathVariable Long id) {
        return ResponseEntity.ok(searchService.getSavedSearchById(id));
    }

    // CRUD: UPDATE SAVED SEARCH
    @PutMapping("/saved/{id}")
    public ResponseEntity<SavedSearchPreference> updateSavedSearch(
            @PathVariable Long id,
            @Valid @RequestBody SavedSearchDTO dto) {
        return ResponseEntity.ok(searchService.updateSavedSearch(id, dto));
    }

    // CRUD: DELETE SAVED SEARCH
    @DeleteMapping("/saved/{id}")
    public ResponseEntity<?> deleteSavedSearch(@PathVariable Long id) {
        searchService.deleteSavedSearch(id);
        return ResponseEntity.ok(Map.of("message", "Saved search preference deleted", "id", id));
    }

    // --- WISHLIST CRUD ---
    @PostMapping("/wishlist/{listingId}")
    public ResponseEntity<WishlistItem> addToWishlist(
            @PathVariable Long listingId,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalArgumentException("Authentication required to add apartment to wishlist.");
        }
        String notes = body != null ? body.get("notes") : "";
        return ResponseEntity.ok(searchService.addToWishlist(listingId, notes, authentication.getName()));
    }

    @GetMapping("/wishlist")
    public ResponseEntity<List<WishlistItem>> getWishlist(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalArgumentException("Authentication required to view wishlist.");
        }
        return ResponseEntity.ok(searchService.getMyWishlist(authentication.getName()));
    }

    @PutMapping("/wishlist/{wishlistId}")
    public ResponseEntity<WishlistItem> updateWishlistNote(
            @PathVariable Long wishlistId,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(searchService.updateWishlistNote(wishlistId, body.get("notes")));
    }

    @DeleteMapping("/wishlist/{wishlistId}")
    public ResponseEntity<?> removeFromWishlist(@PathVariable Long wishlistId, Authentication authentication) {
        searchService.removeFromWishlist(wishlistId, authentication != null ? authentication.getName() : null);
        return ResponseEntity.ok(Map.of("message", "Removed from wishlist", "id", wishlistId));
    }
}
