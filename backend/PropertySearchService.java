package com.sliit.se2030.apartmentsales.service;

import com.sliit.se2030.apartmentsales.model.*;
import com.sliit.se2030.apartmentsales.dto.*;
import com.sliit.se2030.apartmentsales.repository.*;
import com.sliit.se2030.apartmentsales.patterns.*;

import com.sliit.se2030.apartmentsales.model.ApartmentListing;
import com.sliit.se2030.apartmentsales.repository.ApartmentListingRepository;
import com.sliit.se2030.apartmentsales.model.ListingStatus;
import com.sliit.se2030.apartmentsales.model.User;
import com.sliit.se2030.apartmentsales.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class PropertySearchService {

    private final ApartmentListingRepository listingRepository;
    private final SavedSearchRepository savedSearchRepository;
    private final WishlistRepository wishlistRepository;
    private final UserRepository userRepository;
    private final ApartmentListingService listingService;

    public PropertySearchService(ApartmentListingRepository listingRepository,
                                 SavedSearchRepository savedSearchRepository,
                                 WishlistRepository wishlistRepository,
                                 UserRepository userRepository,
                                 ApartmentListingService listingService) {
        this.listingRepository = listingRepository;
        this.savedSearchRepository = savedSearchRepository;
        this.wishlistRepository = wishlistRepository;
        this.userRepository = userRepository;
        this.listingService = listingService;
    }

    // DISCOVERY & FILTERING (Module 2.2: Parameter Validation & Sanitization)
    public List<ApartmentListing> search(String keyword, String city, Double minPrice, Double maxPrice, Integer bedrooms, String propertyType) {
        // Validate and sanitize search parameters
        if (minPrice != null && minPrice < 0) {
            minPrice = 0.0; // Sanitize negative minPrice to zero
        }
        if (maxPrice != null && maxPrice < 0) {
            throw new IllegalArgumentException("Maximum price cannot be negative.");
        }
        if (minPrice != null && maxPrice != null && minPrice > maxPrice) {
            throw new IllegalArgumentException("Minimum price (LKR " + minPrice + ") cannot exceed maximum price (LKR " + maxPrice + ").");
        }
        if (bedrooms != null && bedrooms < 1) {
            bedrooms = null; // Sanitize invalid bedroom count (must be >= 1)
        }

        listingService.reconcileListingStatuses();
        List<ApartmentListing> listings = listingRepository.searchListings(
                (city != null && !city.isBlank()) ? city.trim() : null,
                minPrice,
                maxPrice,
                bedrooms,
                (propertyType != null && !propertyType.isBlank()) ? propertyType.trim() : null
        );

        if (keyword != null && !keyword.isBlank()) {
            String lowerKw = keyword.toLowerCase().trim();
            listings = listings.stream().filter(l ->
                    (l.getTitle() != null && l.getTitle().toLowerCase().contains(lowerKw)) ||
                    (l.getDescription() != null && l.getDescription().toLowerCase().contains(lowerKw)) ||
                    (l.getAddress() != null && l.getAddress().toLowerCase().contains(lowerKw)) ||
                    (l.getAmenities() != null && l.getAmenities().toLowerCase().contains(lowerKw))
            ).collect(Collectors.toList());
        }

        return listings;
    }

    // CRUD 1: CREATE SAVED SEARCH
    public SavedSearchPreference createSavedSearch(SavedSearchDTO dto, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail));

        validateSavedSearchDTO(dto);

        SavedSearchPreference pref = new SavedSearchPreference();
        pref.setTitle(dto.getTitle());
        pref.setCity(dto.getCity());
        pref.setMinPrice(dto.getMinPrice());
        pref.setMaxPrice(dto.getMaxPrice());
        pref.setBedrooms(dto.getBedrooms());
        pref.setPropertyType(dto.getPropertyType());
        pref.setNotifyEmail(dto.isNotifyEmail());
        pref.setUser(user);

        return savedSearchRepository.save(pref);
    }

    // CRUD 2: READ SAVED SEARCHES
    public List<SavedSearchPreference> getMySavedSearches(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail));
        return savedSearchRepository.findByUser(user);
    }

    public SavedSearchPreference getSavedSearchById(Long id) {
        return savedSearchRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Saved search not found with ID: " + id));
    }

    // CRUD 3: UPDATE SAVED SEARCH
    public SavedSearchPreference updateSavedSearch(Long id, SavedSearchDTO dto) {
        SavedSearchPreference pref = getSavedSearchById(id);
        validateSavedSearchDTO(dto);

        pref.setTitle(dto.getTitle());
        pref.setCity(dto.getCity());
        pref.setMinPrice(dto.getMinPrice());
        pref.setMaxPrice(dto.getMaxPrice());
        pref.setBedrooms(dto.getBedrooms());
        pref.setPropertyType(dto.getPropertyType());
        pref.setNotifyEmail(dto.isNotifyEmail());
        return savedSearchRepository.save(pref);
    }

    private void validateSavedSearchDTO(SavedSearchDTO dto) {
        if (dto.getMinPrice() != null && dto.getMinPrice() < 0) {
            throw new IllegalArgumentException("Minimum price cannot be negative.");
        }
        if (dto.getMaxPrice() != null && dto.getMaxPrice() < 0) {
            throw new IllegalArgumentException("Maximum price cannot be negative.");
        }
        if (dto.getMinPrice() != null && dto.getMaxPrice() != null && dto.getMinPrice() > dto.getMaxPrice()) {
            throw new IllegalArgumentException("Minimum price cannot exceed maximum price.");
        }
        if (dto.getBedrooms() != null && dto.getBedrooms() < 1) {
            throw new IllegalArgumentException("Bedrooms must be at least 1.");
        }
    }

    // CRUD 4: DELETE SAVED SEARCH
    public void deleteSavedSearch(Long id) {
        SavedSearchPreference pref = getSavedSearchById(id);
        savedSearchRepository.delete(pref);
    }

    // --- WISHLIST / FAVORITES CRUD ---

    // WISHLIST: CREATE (ADD)
    public WishlistItem addToWishlist(Long listingId, String notes, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail));
        ApartmentListing listing = listingRepository.findById(listingId)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found with ID: " + listingId));

        return wishlistRepository.findByUserAndListing(user, listing)
                .orElseGet(() -> wishlistRepository.save(new WishlistItem(user, listing, notes)));
    }

    // WISHLIST: READ ALL
    public List<WishlistItem> getMyWishlist(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail));
        return wishlistRepository.findByUser(user);
    }

    // WISHLIST: UPDATE NOTE
    public WishlistItem updateWishlistNote(Long wishlistId, String notes) {
        WishlistItem item = wishlistRepository.findById(wishlistId)
                .orElseThrow(() -> new IllegalArgumentException("Wishlist item not found: " + wishlistId));
        item.setUserNotes(notes);
        return wishlistRepository.save(item);
    }

    // WISHLIST: DELETE
    public void removeFromWishlist(Long wishlistId, String userEmail) {
        WishlistItem item = wishlistRepository.findById(wishlistId)
                .orElseThrow(() -> new IllegalArgumentException("Wishlist item not found: " + wishlistId));
        if (userEmail != null) {
            User user = userRepository.findByEmail(userEmail).orElse(null);
            if (user != null && user.getRole() != Role.ADMIN && !item.getUser().getId().equals(user.getId())) {
                throw new org.springframework.security.access.AccessDeniedException("You can only remove items from your own wishlist.");
            }
        }
        wishlistRepository.delete(item);
    }
}
