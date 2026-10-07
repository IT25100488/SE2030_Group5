package com.sliit.se2030.apartmentsales.service;

import com.sliit.se2030.apartmentsales.model.*;
import com.sliit.se2030.apartmentsales.dto.*;
import com.sliit.se2030.apartmentsales.repository.*;
import com.sliit.se2030.apartmentsales.patterns.*;

import com.sliit.se2030.apartmentsales.model.User;
import com.sliit.se2030.apartmentsales.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ApartmentListingService {

    private final ApartmentListingRepository listingRepository;
    private final UserRepository userRepository;
    private final PurchaseReservationRepository reservationRepository;
    private final ApartmentReviewRepository reviewRepository;
    private final SupportTicketRepository ticketRepository;
    private final ViewingAppointmentRepository appointmentRepository;
    private final WishlistRepository wishlistRepository;

    public static final List<ReservationStatus> ACTIVE_RESERVATION_STATUSES = List.of(
            ReservationStatus.OFFER_SUBMITTED,
            ReservationStatus.APPROVED,
            ReservationStatus.RESERVED,
            ReservationStatus.PAYMENT_PENDING,
            ReservationStatus.PAYMENT_RECEIVED,
            ReservationStatus.CONFIRMED,
            ReservationStatus.COMPLETED
    );

    public static final List<ReservationStatus> IN_PROGRESS_RESERVATION_STATUSES = List.of(
            ReservationStatus.OFFER_SUBMITTED,
            ReservationStatus.APPROVED,
            ReservationStatus.RESERVED,
            ReservationStatus.PAYMENT_PENDING,
            ReservationStatus.PAYMENT_RECEIVED,
            ReservationStatus.CONFIRMED
    );

    public ApartmentListingService(ApartmentListingRepository listingRepository,
                                   UserRepository userRepository,
                                   PurchaseReservationRepository reservationRepository,
                                   ApartmentReviewRepository reviewRepository,
                                   SupportTicketRepository ticketRepository,
                                   ViewingAppointmentRepository appointmentRepository,
                                   WishlistRepository wishlistRepository) {
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
        this.reservationRepository = reservationRepository;
        this.reviewRepository = reviewRepository;
        this.ticketRepository = ticketRepository;
        this.appointmentRepository = appointmentRepository;
        this.wishlistRepository = wishlistRepository;
    }

    /**
     * Self-healing Inventory Reconciliation:
     * If a listing is flagged as SOLD or RESERVED, but has NO active PurchaseReservation
     * in the system (e.g. after clearing database tables or cancelling transactions),
     * automatically revert the listing status back to AVAILABLE.
     */
    @Transactional
    public void reconcileListingStatuses() {
        List<ApartmentListing> stuckListings = listingRepository.findByStatusIn(
                List.of(ListingStatus.SOLD, ListingStatus.RESERVED)
        );
        for (ApartmentListing listing : stuckListings) {
            boolean hasActiveReservation = reservationRepository.existsByListingAndStatusIn(
                    listing, ACTIVE_RESERVATION_STATUSES
            );
            if (!hasActiveReservation) {
                listing.setStatus(ListingStatus.AVAILABLE);
                listing.setUpdatedAt(LocalDateTime.now());
                listingRepository.save(listing);
            }
        }
    }

    // CRUD: CREATE
    public ApartmentListing createListing(ApartmentListingDTO dto, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userEmail));

        if (user.getRole() == Role.BUYER) {
            throw new org.springframework.security.access.AccessDeniedException("Buyers are not authorized to create property listings. Only Sellers, Agents, and Administrators can manage listings.");
        }

        ApartmentListing listing = new ApartmentListing();
        listing.setTitle(dto.getTitle());
        listing.setDescription(dto.getDescription());
        listing.setPropertyType(dto.getPropertyType());
        listing.setPrice(dto.getPrice());
        listing.setSizeSqft(dto.getSizeSqft());
        listing.setBedrooms(dto.getBedrooms());
        listing.setBathrooms(dto.getBathrooms());
        listing.setAddress(dto.getAddress());
        listing.setCity(dto.getCity());
        listing.setDistrict(dto.getDistrict() != null ? dto.getDistrict() : dto.getCity());
        listing.setAmenities(dto.getAmenities());
        listing.setImageUrl(dto.getImageUrl());
        if (dto.getSellerId() != null && user.getRole() == Role.ADMIN) {
            userRepository.findById(dto.getSellerId()).ifPresent(listing::setSeller);
        } else {
            listing.setSeller(user);
        }

        // For an Agent creating a property, they act as the seller for their own property, and are also the managing agent
        if (user.getRole() == Role.AGENT) {
            listing.setSeller(user);
            listing.setAgent(user);
        } else if (dto.getAgentId() != null) {
            userRepository.findById(dto.getAgentId()).ifPresent(listing::setAgent);
        }

        // When a seller or agent adds an apartment to his listings, it automatically becomes DRAFT until grant access from Super Admin
        if (user.getRole() != Role.ADMIN) {
            listing.setStatus(ListingStatus.DRAFT);
        } else {
            listing.setStatus(dto.getStatus() != null ? dto.getStatus() : ListingStatus.AVAILABLE);
        }

        return listingRepository.save(listing);
    }

    // CRUD: READ ALL (Ordered newest-first so new apartments appear on the first card)
    public List<ApartmentListing> getAllListings() {
        reconcileListingStatuses();
        return listingRepository.findAllByOrderByIdDesc();
    }

    // CRUD: READ AVAILABLE (Public catalog - ordered newest-first)
    public List<ApartmentListing> getAvailableListings() {
        reconcileListingStatuses();
        return listingRepository.findByStatusInOrderByIdDesc(java.util.List.of(ListingStatus.AVAILABLE, ListingStatus.RESERVED));
    }

    // CRUD: READ BY ID
    public ApartmentListing getListingById(Long id) {
        return listingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Listing not found with ID: " + id));
    }

    // CRUD: READ MY LISTINGS (Seller or Agent acting as seller/agent, active non-archived inventory)
    public List<ApartmentListing> getMyListings(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getRole() == Role.AGENT) {
            return listingRepository.findActiveBySellerOrAgentOrderByIdDesc(user, user);
        }
        return listingRepository.findActiveBySellerOrderByIdDesc(user);
    }

    // CRUD: UPDATE
    public ApartmentListing updateListing(Long id, ApartmentListingDTO dto, String userEmail) {
        ApartmentListing listing = getListingById(id);
        
        User user = userEmail != null ? userRepository.findByEmail(userEmail).orElse(null) : null;
        if (user != null && user.getRole() != Role.ADMIN) {
            boolean isOwner = (listing.getSeller() != null && listing.getSeller().getId().equals(user.getId()));
            boolean isAgent = (listing.getAgent() != null && listing.getAgent().getId().equals(user.getId()));
            if (!isOwner && !isAgent) {
                throw new org.springframework.security.access.AccessDeniedException("You can only update your own listings.");
            }
        }

        // Legal Freeze: Specifications and pricing cannot be edited while an active reservation or contract exists
        boolean hasActiveReservation = reservationRepository.existsByListingAndStatusIn(
                listing, ACTIVE_RESERVATION_STATUSES
        );
        if (hasActiveReservation && user != null && user.getRole() != Role.ADMIN) {
            throw new IllegalStateException("Property specifications and pricing are legally frozen while an active reservation or purchase agreement is in progress.");
        }

        // SPECIFICATION BLOCK POLICY:
        // After Super Admin approval (status is no longer DRAFT or PENDING_APPROVAL),
        // both Agent and Seller can ONLY edit Title, Description, and Image.
        // All core specifications (Price, Property Type, Size, Bedrooms, Bathrooms, Location, Amenities) are blocked from being altered.
        boolean isApproved = listing.getStatus() != ListingStatus.DRAFT && listing.getStatus() != ListingStatus.PENDING_APPROVAL;
        if (user != null && user.getRole() != Role.ADMIN && isApproved) {
            listing.setTitle(dto.getTitle());
            listing.setDescription(dto.getDescription());
            if (dto.getImageUrl() != null && !dto.getImageUrl().isBlank()) {
                listing.setImageUrl(dto.getImageUrl());
            }
            listing.setUpdatedAt(LocalDateTime.now());
            return listingRepository.save(listing);
        }

        // Prior to approval (or for ADMIN): can edit all fields
        listing.setTitle(dto.getTitle());
        listing.setDescription(dto.getDescription());
        listing.setPropertyType(dto.getPropertyType());
        listing.setPrice(dto.getPrice());
        listing.setSizeSqft(dto.getSizeSqft());
        listing.setBedrooms(dto.getBedrooms());
        listing.setBathrooms(dto.getBathrooms());
        listing.setAddress(dto.getAddress());
        listing.setCity(dto.getCity());
        listing.setDistrict(dto.getDistrict());
        listing.setAmenities(dto.getAmenities());
        if (dto.getImageUrl() != null && !dto.getImageUrl().isBlank()) {
            listing.setImageUrl(dto.getImageUrl());
        }
        if (dto.getStatus() != null) {
            if (user != null && user.getRole() != Role.ADMIN) {
                // Non-admins can set DRAFT while editing; only Super Admin can grant access (AVAILABLE) or revoke (REVOKED)
                if (dto.getStatus() == ListingStatus.DRAFT) {
                    listing.setStatus(ListingStatus.DRAFT);
                }
            } else {
                listing.setStatus(dto.getStatus());
            }
        }
        if (dto.getAgentId() != null) {
            userRepository.findById(dto.getAgentId()).ifPresent(listing::setAgent);
        }
        if (dto.getSellerId() != null && user != null && user.getRole() == Role.ADMIN) {
            userRepository.findById(dto.getSellerId()).ifPresent(listing::setSeller);
        }
        listing.setUpdatedAt(LocalDateTime.now());

        return listingRepository.save(listing);
    }

    // CRUD: UPDATE STATUS (Inventory workflow)
    public ApartmentListing updateListingStatus(Long id, ListingStatus newStatus, String userEmail) {
        ApartmentListing listing = getListingById(id);

        User user = userEmail != null ? userRepository.findByEmail(userEmail).orElse(null) : null;
        if (user != null && user.getRole() != Role.ADMIN) {
            boolean isOwner = (listing.getSeller() != null && listing.getSeller().getId().equals(user.getId()));
            boolean isAgent = (listing.getAgent() != null && listing.getAgent().getId().equals(user.getId()));
            if (!isOwner && !isAgent) {
                throw new org.springframework.security.access.AccessDeniedException("You can only update your own listings.");
            }
            // Once approved, sellers and agents cannot modify listing status
            boolean isApproved = listing.getStatus() != ListingStatus.DRAFT && listing.getStatus() != ListingStatus.PENDING_APPROVAL;
            if (isApproved && newStatus != listing.getStatus()) {
                throw new org.springframework.security.access.AccessDeniedException("Listing status cannot be modified by sellers or agents after admin approval.");
            }
            // Only Super Admin has access to grant access (AVAILABLE) or revoke (REVOKED)
            if (newStatus == ListingStatus.AVAILABLE || newStatus == ListingStatus.REVOKED) {
                throw new org.springframework.security.access.AccessDeniedException("Only Super Admin has access to grant access or revoke apartment listings.");
            }
            if (newStatus == ListingStatus.RESERVED || newStatus == ListingStatus.SOLD || newStatus == ListingStatus.ARCHIVED) {
                throw new IllegalArgumentException("Sellers and Agents cannot manually transition properties to RESERVED, SOLD, or ARCHIVED. These statuses are strictly managed by system purchase transactions or System Administrators.");
            }
        }

        listing.setStatus(newStatus);
        listing.setUpdatedAt(LocalDateTime.now());
        return listingRepository.save(listing);
    }

    // CRUD: DELETE (With Foreign-Key Safe Cascading and Audit Preservation)
    public void deleteListing(Long id, String userEmail) {
        ApartmentListing listing = getListingById(id);

        User user = userEmail != null ? userRepository.findByEmail(userEmail).orElse(null) : null;
        if (user != null && user.getRole() != Role.ADMIN) {
            boolean isOwner = (listing.getSeller() != null && listing.getSeller().getId().equals(user.getId()));
            boolean isAgent = (listing.getAgent() != null && listing.getAgent().getId().equals(user.getId()));
            if (!isOwner && !isAgent) {
                throw new org.springframework.security.access.AccessDeniedException("You can only delete your own listings.");
            }
        }

        // Prevent deleting a property that has active buyer reservations in progress
        boolean hasInProgressReservation = reservationRepository.existsByListingAndStatusIn(
                listing, IN_PROGRESS_RESERVATION_STATUSES
        );
        if (hasInProgressReservation) {
            throw new IllegalStateException("Cannot delete or unlist a property that has active buyer reservations or transactions in progress. The active contract must be resolved first.");
        }

        // Soft-delete / Archive if historical transactions or invoices exist to maintain financial integrity
        boolean hasPastTransactions = reservationRepository.existsByListing(listing);
        if (hasPastTransactions) {
            listing.setStatus(ListingStatus.ARCHIVED);
            listing.setUpdatedAt(LocalDateTime.now());
            listingRepository.save(listing);
            return;
        }

        // Clean removal for properties with no financial or transaction history
        reviewRepository.deleteAll(reviewRepository.findByListing(listing));
        ticketRepository.deleteAll(ticketRepository.findByListing(listing));
        appointmentRepository.deleteAll(appointmentRepository.findByListing(listing));
        wishlistRepository.deleteAll(wishlistRepository.findByListing(listing));
        listingRepository.delete(listing);
    }
}
