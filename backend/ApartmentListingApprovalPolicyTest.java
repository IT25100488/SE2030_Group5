package com.sliit.se2030.apartmentsales;

import com.sliit.se2030.apartmentsales.dto.ApartmentListingDTO;
import com.sliit.se2030.apartmentsales.model.*;
import com.sliit.se2030.apartmentsales.repository.*;
import com.sliit.se2030.apartmentsales.service.ApartmentListingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Apartment Listing Specifications Blocking Policy Tests")
public class ApartmentListingApprovalPolicyTest {

    @Mock
    private ApartmentListingRepository listingRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PurchaseReservationRepository reservationRepository;

    @Mock
    private ApartmentReviewRepository reviewRepository;

    @Mock
    private SupportTicketRepository ticketRepository;

    @Mock
    private ViewingAppointmentRepository appointmentRepository;

    @Mock
    private WishlistRepository wishlistRepository;

    @InjectMocks
    private ApartmentListingService listingService;

    private User seller;
    private User agent;
    private User admin;
    private ApartmentListing draftListing;
    private ApartmentListing approvedListing;

    @BeforeEach
    void setUp() {
        seller = new User();
        seller.setId(10L);
        seller.setEmail("seller@test.com");
        seller.setFullName("John Seller");
        seller.setRole(Role.SELLER);

        agent = new User();
        agent.setId(20L);
        agent.setEmail("agent@test.com");
        agent.setFullName("Jane Agent");
        agent.setRole(Role.AGENT);

        admin = new User();
        admin.setId(1L);
        admin.setEmail("admin@test.com");
        admin.setFullName("Super Admin");
        admin.setRole(Role.ADMIN);

        // Pre-approval draft listing
        draftListing = new ApartmentListing();
        draftListing.setId(101L);
        draftListing.setTitle("Original Draft Title");
        draftListing.setDescription("Original draft description");
        draftListing.setPropertyType("Standard Apartment");
        draftListing.setPrice(30_000_000.0);
        draftListing.setSizeSqft(1200.0);
        draftListing.setBedrooms(2);
        draftListing.setBathrooms(2);
        draftListing.setCity("Colombo");
        draftListing.setDistrict("Colombo 03");
        draftListing.setAddress("10 Galle Face");
        draftListing.setAmenities("Pool, Gym");
        draftListing.setImageUrl("https://example.com/draft.jpg");
        draftListing.setStatus(ListingStatus.DRAFT);
        draftListing.setSeller(seller);

        // Post-approval approved listing
        approvedListing = new ApartmentListing();
        approvedListing.setId(202L);
        approvedListing.setTitle("Verified Luxury Suite");
        approvedListing.setDescription("Approved luxury finishes");
        approvedListing.setPropertyType("Luxury Suite");
        approvedListing.setPrice(75_000_000.0);
        approvedListing.setSizeSqft(2000.0);
        approvedListing.setBedrooms(3);
        approvedListing.setBathrooms(3);
        approvedListing.setCity("Colombo");
        approvedListing.setDistrict("Colombo 07");
        approvedListing.setAddress("25 Cinnamon Gardens");
        approvedListing.setAmenities("Infinity Pool, Concierge, Rooftop Lounge");
        approvedListing.setImageUrl("https://example.com/approved.jpg");
        approvedListing.setStatus(ListingStatus.AVAILABLE);
        approvedListing.setSeller(seller);
        approvedListing.setAgent(agent);
    }

    @Test
    @DisplayName("Pre-Approval: Seller can edit all specifications and pricing while in DRAFT")
    void testPreApprovalFullEditingAllowedForSeller() {
        when(listingRepository.findById(101L)).thenReturn(Optional.of(draftListing));
        when(userRepository.findByEmail("seller@test.com")).thenReturn(Optional.of(seller));
        when(reservationRepository.existsByListingAndStatusIn(any(), any())).thenReturn(false);
        when(listingRepository.save(any(ApartmentListing.class))).thenAnswer(i -> i.getArgument(0));

        ApartmentListingDTO dto = new ApartmentListingDTO();
        dto.setTitle("Updated Draft Title");
        dto.setDescription("Updated draft description");
        dto.setPropertyType("Penthouse");
        dto.setPrice(45_000_000.0);
        dto.setSizeSqft(1800.0);
        dto.setBedrooms(4);
        dto.setBathrooms(3);
        dto.setCity("Kandy");
        dto.setDistrict("Kandy Central");
        dto.setAddress("88 Hill Street");
        dto.setAmenities("Garden, Jacuzzi");
        dto.setImageUrl("https://example.com/new-draft.jpg");

        ApartmentListing result = listingService.updateListing(101L, dto, "seller@test.com");

        assertEquals("Updated Draft Title", result.getTitle());
        assertEquals("Updated draft description", result.getDescription());
        assertEquals("Penthouse", result.getPropertyType());
        assertEquals(45_000_000.0, result.getPrice());
        assertEquals(1800.0, result.getSizeSqft());
        assertEquals(4, result.getBedrooms());
        assertEquals(3, result.getBathrooms());
        assertEquals("Kandy", result.getCity());
        assertEquals("https://example.com/new-draft.jpg", result.getImageUrl());
    }

    @Test
    @DisplayName("Post-Approval: Seller/Agent specifications are blocked; only Title, Description, and Image are updated")
    void testPostApprovalSpecificationsAreBlockedForSeller() {
        when(listingRepository.findById(202L)).thenReturn(Optional.of(approvedListing));
        when(userRepository.findByEmail("seller@test.com")).thenReturn(Optional.of(seller));
        when(reservationRepository.existsByListingAndStatusIn(any(), any())).thenReturn(false);
        when(listingRepository.save(any(ApartmentListing.class))).thenAnswer(i -> i.getArgument(0));

        ApartmentListingDTO dto = new ApartmentListingDTO();
        // Allowed changes:
        dto.setTitle("New Renamed Luxury Suite Title");
        dto.setDescription("Updated marketing description with lifestyle perks");
        dto.setImageUrl("https://example.com/new-photo.jpg");

        // Attempted changes to specifications (MUST BE BLOCKED):
        dto.setPropertyType("Studio Apartment");
        dto.setPrice(10_000_000.0); // Attempt to slash price
        dto.setSizeSqft(500.0);       // Attempt to change area
        dto.setBedrooms(1);
        dto.setBathrooms(1);
        dto.setCity("Galle");
        dto.setAddress("Hacked Address");

        ApartmentListing result = listingService.updateListing(202L, dto, "seller@test.com");

        // Allowed fields ARE updated:
        assertEquals("New Renamed Luxury Suite Title", result.getTitle());
        assertEquals("Updated marketing description with lifestyle perks", result.getDescription());
        assertEquals("https://example.com/new-photo.jpg", result.getImageUrl());

        // Specifications are PRESERVED and BLOCKED:
        assertEquals("Luxury Suite", result.getPropertyType(), "Property type should remain locked");
        assertEquals(75_000_000.0, result.getPrice(), "Price should remain locked at original 75M");
        assertEquals(2000.0, result.getSizeSqft(), "Size sqft should remain locked at 2000");
        assertEquals(3, result.getBedrooms(), "Bedrooms should remain locked at 3");
        assertEquals(3, result.getBathrooms(), "Bathrooms should remain locked at 3");
        assertEquals("Colombo", result.getCity(), "City should remain locked");
        assertEquals("25 Cinnamon Gardens", result.getAddress(), "Address should remain locked");
        assertEquals(ListingStatus.AVAILABLE, result.getStatus(), "Status should remain AVAILABLE");
    }

    @Test
    @DisplayName("Post-Approval: Agent specifications are blocked as well; only Title, Description, and Image are updated")
    void testPostApprovalSpecificationsAreBlockedForAgent() {
        when(listingRepository.findById(202L)).thenReturn(Optional.of(approvedListing));
        when(userRepository.findByEmail("agent@test.com")).thenReturn(Optional.of(agent));
        when(reservationRepository.existsByListingAndStatusIn(any(), any())).thenReturn(false);
        when(listingRepository.save(any(ApartmentListing.class))).thenAnswer(i -> i.getArgument(0));

        ApartmentListingDTO dto = new ApartmentListingDTO();
        dto.setTitle("Agent Revised Suite Title");
        dto.setDescription("Agent updated copy");
        dto.setImageUrl("https://example.com/agent-new-photo.jpg");

        // Attempted spec tampering:
        dto.setPrice(99_000_000.0);
        dto.setBedrooms(5);

        ApartmentListing result = listingService.updateListing(202L, dto, "agent@test.com");

        assertEquals("Agent Revised Suite Title", result.getTitle());
        assertEquals("Agent updated copy", result.getDescription());
        assertEquals("https://example.com/agent-new-photo.jpg", result.getImageUrl());
        assertEquals(75_000_000.0, result.getPrice(), "Price must NOT change");
        assertEquals(3, result.getBedrooms(), "Bedrooms must NOT change");
    }

    @Test
    @DisplayName("Admin has full authority to edit specifications even after approval")
    void testAdminCanEditSpecificationsAfterApproval() {
        when(listingRepository.findById(202L)).thenReturn(Optional.of(approvedListing));
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));
        when(listingRepository.save(any(ApartmentListing.class))).thenAnswer(i -> i.getArgument(0));

        ApartmentListingDTO dto = new ApartmentListingDTO();
        dto.setTitle("Admin Adjusted Title");
        dto.setDescription("Admin adjusted description");
        dto.setPropertyType("Penthouse Suite");
        dto.setPrice(80_000_000.0);
        dto.setSizeSqft(2200.0);
        dto.setBedrooms(4);
        dto.setBathrooms(4);
        dto.setCity("Colombo");
        dto.setDistrict("Colombo 07");
        dto.setAddress("25 Cinnamon Gardens");
        dto.setImageUrl("https://example.com/admin.jpg");

        ApartmentListing result = listingService.updateListing(202L, dto, "admin@test.com");

        assertEquals("Admin Adjusted Title", result.getTitle());
        assertEquals("Penthouse Suite", result.getPropertyType());
        assertEquals(80_000_000.0, result.getPrice());
        assertEquals(4, result.getBedrooms());
    }

    @Test
    @DisplayName("Post-Approval: Seller cannot modify status of an approved listing")
    void testPostApprovalSellerCannotModifyListingStatus() {
        when(listingRepository.findById(202L)).thenReturn(Optional.of(approvedListing));
        when(userRepository.findByEmail("seller@test.com")).thenReturn(Optional.of(seller));

        assertThrows(AccessDeniedException.class, () -> {
            listingService.updateListingStatus(202L, ListingStatus.DRAFT, "seller@test.com");
        });
    }
}
