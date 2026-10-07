package com.sliit.se2030.apartmentsales;

import com.sliit.se2030.apartmentsales.dto.AppointmentDTO;
import com.sliit.se2030.apartmentsales.dto.PurchaseReservationDTO;
import com.sliit.se2030.apartmentsales.model.*;
import com.sliit.se2030.apartmentsales.patterns.PaymentProcessorFactory;
import com.sliit.se2030.apartmentsales.patterns.PricingStrategyFactory;
import com.sliit.se2030.apartmentsales.patterns.RefundPolicyFactory;
import com.sliit.se2030.apartmentsales.repository.*;
import com.sliit.se2030.apartmentsales.service.PurchaseTransactionService;
import com.sliit.se2030.apartmentsales.service.ViewingInquiryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Buyer-Only Tour Scheduling and Reservation Policy Tests")
public class BuyerOnlyTourAndReservationPolicyTest {

    @Mock
    private ViewingAppointmentRepository appointmentRepository;

    @Mock
    private SupportTicketRepository ticketRepository;

    @Mock
    private ApartmentListingRepository listingRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PurchaseReservationRepository reservationRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private ViewingInquiryService viewingInquiryService;
    private PurchaseTransactionService purchaseTransactionService;

    private ApartmentListing listing;
    private User buyer;
    private User seller;
    private User agent;
    private User admin;

    @BeforeEach
    void setUp() {
        viewingInquiryService = new ViewingInquiryService(
                appointmentRepository,
                ticketRepository,
                listingRepository,
                userRepository,
                eventPublisher
        );

        purchaseTransactionService = new PurchaseTransactionService(
                reservationRepository,
                listingRepository,
                userRepository,
                new PaymentProcessorFactory(),
                new PricingStrategyFactory(),
                new RefundPolicyFactory(),
                eventPublisher
        );

        listing = new ApartmentListing();
        listing.setId(100L);
        listing.setTitle("Ocean View Residence");
        listing.setStatus(ListingStatus.AVAILABLE);
        listing.setPrice(45000000.0);

        buyer = new User();
        buyer.setId(1L);
        buyer.setEmail("buyer@example.com");
        buyer.setRole(Role.BUYER);
        buyer.setPhone("0771234567");

        seller = new User();
        seller.setId(2L);
        seller.setEmail("seller@example.com");
        seller.setRole(Role.SELLER);
        seller.setPhone("0772345678");

        agent = new User();
        agent.setId(3L);
        agent.setEmail("agent@example.com");
        agent.setRole(Role.AGENT);
        agent.setPhone("0773456789");

        admin = new User();
        admin.setId(4L);
        admin.setEmail("admin@example.com");
        admin.setRole(Role.ADMIN);
        admin.setPhone("0774567890");
    }

    // --- TOUR SCHEDULING TESTS ---

    @Test
    @DisplayName("BUYER role can schedule a viewing tour")
    void buyerCanScheduleTour() {
        AppointmentDTO dto = new AppointmentDTO();
        dto.setListingId(100L);
        dto.setAppointmentDate(LocalDate.of(2026, 11, 1));
        dto.setAppointmentTime("10:00 AM - 11:00 AM");
        dto.setContactPhone("0771234567");

        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(listingRepository.findById(100L)).thenReturn(Optional.of(listing));
        when(appointmentRepository.existsByListingAndAppointmentDateAndAppointmentTimeAndStatusIn(any(), any(), any(), any())).thenReturn(false);
        when(appointmentRepository.countByBuyerAndStatusIn(any(), any())).thenReturn(0L);
        when(appointmentRepository.save(any(ViewingAppointment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ViewingAppointment result = viewingInquiryService.createAppointment(dto, "buyer@example.com");

        assertNotNull(result);
        assertEquals(buyer, result.getBuyer());
        assertEquals(LocalDate.of(2026, 11, 1), result.getAppointmentDate());
        verify(appointmentRepository).save(any(ViewingAppointment.class));
    }

    @Test
    @DisplayName("SELLER role is blocked from scheduling a viewing tour")
    void sellerCannotScheduleTour() {
        AppointmentDTO dto = new AppointmentDTO();
        dto.setListingId(100L);
        dto.setAppointmentDate(LocalDate.of(2026, 11, 1));
        dto.setAppointmentTime("10:00 AM - 11:00 AM");
        dto.setContactPhone("0772345678");

        when(userRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(seller));
        when(listingRepository.findById(100L)).thenReturn(Optional.of(listing));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                viewingInquiryService.createAppointment(dto, "seller@example.com")
        );

        assertTrue(ex.getMessage().contains("Only registered buyers can schedule viewing tours"));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("AGENT role is blocked from scheduling a viewing tour")
    void agentCannotScheduleTour() {
        AppointmentDTO dto = new AppointmentDTO();
        dto.setListingId(100L);
        dto.setAppointmentDate(LocalDate.of(2026, 11, 1));
        dto.setAppointmentTime("10:00 AM - 11:00 AM");

        when(userRepository.findByEmail("agent@example.com")).thenReturn(Optional.of(agent));
        when(listingRepository.findById(100L)).thenReturn(Optional.of(listing));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                viewingInquiryService.createAppointment(dto, "agent@example.com")
        );

        assertTrue(ex.getMessage().contains("Only registered buyers can schedule viewing tours"));
        verify(appointmentRepository, never()).save(any());
    }

    @Test
    @DisplayName("ADMIN role is blocked from scheduling a viewing tour")
    void adminCannotScheduleTour() {
        AppointmentDTO dto = new AppointmentDTO();
        dto.setListingId(100L);
        dto.setAppointmentDate(LocalDate.of(2026, 11, 1));
        dto.setAppointmentTime("10:00 AM - 11:00 AM");

        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));
        when(listingRepository.findById(100L)).thenReturn(Optional.of(listing));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                viewingInquiryService.createAppointment(dto, "admin@example.com")
        );

        assertTrue(ex.getMessage().contains("Only registered buyers can schedule viewing tours"));
        verify(appointmentRepository, never()).save(any());
    }

    // --- PURCHASE RESERVATION TESTS ---

    @Test
    @DisplayName("BUYER role can create an apartment reservation offer")
    void buyerCanCreateReservationOffer() {
        PurchaseReservationDTO dto = new PurchaseReservationDTO();
        dto.setListingId(100L);
        dto.setPricingPlan("STANDARD");
        dto.setNotes("First floor preferred");

        when(userRepository.findByEmail("buyer@example.com")).thenReturn(Optional.of(buyer));
        when(listingRepository.findById(100L)).thenReturn(Optional.of(listing));
        when(reservationRepository.save(any(PurchaseReservation.class))).thenAnswer(invocation -> {
            PurchaseReservation r = invocation.getArgument(0);
            if (r.getId() == null) r.setId(55L);
            return r;
        });

        PurchaseReservation result = purchaseTransactionService.createReservationOffer(dto, "buyer@example.com");

        assertNotNull(result);
        assertEquals(buyer, result.getBuyer());
        assertEquals(listing, result.getListing());
        assertEquals(ListingStatus.RESERVED, listing.getStatus());
        verify(reservationRepository, atLeastOnce()).save(any(PurchaseReservation.class));
    }

    @Test
    @DisplayName("SELLER role is blocked from reserving an apartment")
    void sellerCannotCreateReservationOffer() {
        PurchaseReservationDTO dto = new PurchaseReservationDTO();
        dto.setListingId(100L);
        dto.setPricingPlan("STANDARD");

        when(userRepository.findByEmail("seller@example.com")).thenReturn(Optional.of(seller));
        when(listingRepository.findById(100L)).thenReturn(Optional.of(listing));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                purchaseTransactionService.createReservationOffer(dto, "seller@example.com")
        );

        assertTrue(ex.getMessage().contains("Only registered buyers can reserve apartments"));
        verify(reservationRepository, never()).save(any());
    }

    @Test
    @DisplayName("AGENT role is blocked from reserving an apartment")
    void agentCannotCreateReservationOffer() {
        PurchaseReservationDTO dto = new PurchaseReservationDTO();
        dto.setListingId(100L);
        dto.setPricingPlan("STANDARD");

        when(userRepository.findByEmail("agent@example.com")).thenReturn(Optional.of(agent));
        when(listingRepository.findById(100L)).thenReturn(Optional.of(listing));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                purchaseTransactionService.createReservationOffer(dto, "agent@example.com")
        );

        assertTrue(ex.getMessage().contains("Only registered buyers can reserve apartments"));
        verify(reservationRepository, never()).save(any());
    }

    @Test
    @DisplayName("ADMIN role is blocked from reserving an apartment")
    void adminCannotCreateReservationOffer() {
        PurchaseReservationDTO dto = new PurchaseReservationDTO();
        dto.setListingId(100L);
        dto.setPricingPlan("STANDARD");

        when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(admin));
        when(listingRepository.findById(100L)).thenReturn(Optional.of(listing));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                purchaseTransactionService.createReservationOffer(dto, "admin@example.com")
        );

        assertTrue(ex.getMessage().contains("Only registered buyers can reserve apartments"));
        verify(reservationRepository, never()).save(any());
    }
}
