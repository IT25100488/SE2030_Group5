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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PurchaseTransactionService {

    private final PurchaseReservationRepository reservationRepository;
    private final ApartmentListingRepository listingRepository;
    private final UserRepository userRepository;
    private final PaymentProcessorFactory paymentProcessorFactory;
    private final PricingStrategyFactory pricingStrategyFactory;
    private final RefundPolicyFactory refundPolicyFactory;
    private final ApplicationEventPublisher eventPublisher;

    public PurchaseTransactionService(PurchaseReservationRepository reservationRepository,
                                      ApartmentListingRepository listingRepository,
                                      UserRepository userRepository,
                                      PaymentProcessorFactory paymentProcessorFactory,
                                      PricingStrategyFactory pricingStrategyFactory,
                                      RefundPolicyFactory refundPolicyFactory,
                                      ApplicationEventPublisher eventPublisher) {
        this.reservationRepository = reservationRepository;
        this.listingRepository = listingRepository;
        this.userRepository = userRepository;
        this.paymentProcessorFactory = paymentProcessorFactory;
        this.pricingStrategyFactory = pricingStrategyFactory;
        this.refundPolicyFactory = refundPolicyFactory;
        this.eventPublisher = eventPublisher;
    }

    // CRUD 1: CREATE RESERVATION OFFER (Applies Strategy Pattern)
    public PurchaseReservation createReservationOffer(PurchaseReservationDTO dto, String buyerEmail) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new IllegalArgumentException("Buyer not found: " + buyerEmail));
        ApartmentListing listing = listingRepository.findById(dto.getListingId())
                .orElseThrow(() -> new IllegalArgumentException("Listing not found: " + dto.getListingId()));

        // Business Rule: Tour scheduling and reservation options are available and functional only for Buyer role
        if (buyer.getRole() != Role.BUYER) {
            throw new IllegalStateException("Only registered buyers can reserve apartments. Please use a registered Buyer account.");
        }

        if (listing.getStatus() == ListingStatus.SOLD || listing.getStatus() == ListingStatus.RESERVED) {
            throw new IllegalStateException("Apartment is already reserved or sold!");
        }

        // Apply Strategy Pattern for pricing calculation (Fixed to apartment list price; no arbitrary offers)
        PricingStrategy pricingStrategy = pricingStrategyFactory.getStrategy(dto.getPricingPlan());
        double finalAmount = pricingStrategy.calculateFinalAmount(listing.getPrice());
        double depositAmount = pricingStrategy.calculateDepositAmount(listing.getPrice());

        PurchaseReservation res = new PurchaseReservation();
        res.setListing(listing);
        res.setBuyer(buyer);
        res.setOfferAmount(finalAmount);
        res.setDepositAmount(depositAmount);
        res.setPricingPlan(pricingStrategy.getStrategyName());
        res.setInvoiceNumber("INV-TEMP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        res.setStatus(ReservationStatus.OFFER_SUBMITTED);
        res.setNotes(dto.getNotes());

        PurchaseReservation saved = reservationRepository.save(res);
        saved.setInvoiceNumber("INV-" + saved.getId());
        saved = reservationRepository.save(saved);

        // Buyer made reservation: set listing status to RESERVED (until full payment / total purchase is done)
        listing.setStatus(ListingStatus.RESERVED);
        listingRepository.save(listing);

        // Observer Pattern Event
        eventPublisher.publishEvent(new ApartmentSalesEvent(
                this, "PURCHASE_OFFER_SUBMITTED", buyerEmail,
                "New reservation offer submitted for: " + listing.getTitle() + " | Invoice: " + saved.getInvoiceNumber()
        ));

        return saved;
    }

    // CRUD 2: READ TRANSACTIONS
    public List<PurchaseReservation> getAllTransactions() {
        return reservationRepository.findAll();
    }

    public PurchaseReservation getTransactionById(Long id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found: " + id));
    }

    public List<PurchaseReservation> getMyTransactions(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getRole() == Role.SELLER || user.getRole() == Role.AGENT) {
            return reservationRepository.findByListingSellerOrAgent(user);
        }
        return reservationRepository.findByBuyer(user);
    }

    public PurchaseReservation getByInvoiceNumber(String invoiceNumber) {
        return reservationRepository.findByInvoiceNumber(invoiceNumber)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceNumber));
    }

    // CRUD 3: UPDATE (Process payment using Factory Pattern)
    public PurchaseReservation processPayment(Long transactionId, PaymentRequestDTO paymentDto) {
        PurchaseReservation res = getTransactionById(transactionId);

        // Utilize Factory Pattern to obtain specific processor
        PaymentProcessor processor = paymentProcessorFactory.getProcessor(paymentDto.getPaymentMethod());
        boolean success = processor.processPayment(paymentDto.getAmount(), paymentDto.getReferenceNumber());

        if (!success) {
            throw new IllegalArgumentException("Payment failed or invalid reference provided for method: " + processor.getPaymentType());
        }

        res.setPaymentMethod(processor.getPaymentType());
        res.setPaymentReference(paymentDto.getReferenceNumber());
        res.setPaymentDate(LocalDateTime.now());
        res.setStatus(ReservationStatus.PAYMENT_PENDING);
        res.setUpdatedAt(LocalDateTime.now());

        // Keep listing status as RESERVED while payment is pending verification
        ApartmentListing listing = res.getListing();
        listing.setStatus(ListingStatus.RESERVED);
        listingRepository.save(listing);

        PurchaseReservation updated = reservationRepository.save(res);

        // Observer event
        eventPublisher.publishEvent(new ApartmentSalesEvent(
                this, "PAYMENT_SUBMITTED", res.getBuyer().getEmail(),
                "Deposit payment of LKR " + paymentDto.getAmount() + " submitted for Invoice: " + res.getInvoiceNumber() + " (Pending Admin Verification)"
        ));

        return updated;
    }

    // CRUD 3: UPDATE STATUS (Approve, Confirm, Complete, Decline, Cancel)
    public PurchaseReservation updateStatus(Long id, ReservationStatus status) {
        PurchaseReservation res = getTransactionById(id);
        res.setStatus(status);
        res.setUpdatedAt(LocalDateTime.now());

        ApartmentListing listing = res.getListing();
        if (status == ReservationStatus.COMPLETED) {
            listing.setStatus(ListingStatus.SOLD);
            listingRepository.save(listing);
            eventPublisher.publishEvent(new ApartmentSalesEvent(
                    this, "PAYMENT_CONFIRMED", res.getBuyer().getEmail(),
                    "Full purchase payment completed for Invoice: " + res.getInvoiceNumber() + ". Apartment is now marked SOLD."
            ));
        } else if (status == ReservationStatus.CONFIRMED || status == ReservationStatus.PAYMENT_RECEIVED) {
            // Keep in RESERVED until total purchase is completed; mark SOLD if 100% full cash payment upfront
            boolean isFullPayment = "FULL_CASH".equalsIgnoreCase(res.getPricingPlan())
                    || (res.getOfferAmount() > 0 && res.getDepositAmount() >= res.getOfferAmount());
            if (isFullPayment) {
                listing.setStatus(ListingStatus.SOLD);
            } else {
                listing.setStatus(ListingStatus.RESERVED);
            }
            listingRepository.save(listing);
            eventPublisher.publishEvent(new ApartmentSalesEvent(
                    this, "PAYMENT_CONFIRMED", res.getBuyer().getEmail(),
                    "Payment for Invoice: " + res.getInvoiceNumber() + " has been verified & confirmed by Admin. (Status: " + listing.getStatus() + ")"
            ));
        } else if (status == ReservationStatus.CANCELLED || status == ReservationStatus.DECLINED) {
            boolean hasPaid = res.getPaymentDate() != null
                    || res.getStatus() == ReservationStatus.PAYMENT_PENDING
                    || res.getStatus() == ReservationStatus.PAYMENT_RECEIVED
                    || res.getStatus() == ReservationStatus.CONFIRMED
                    || res.getStatus() == ReservationStatus.COMPLETED;

            if (hasPaid) {
                if (res.getRefundType() == null) {
                    LocalDateTime baseDate = res.getPaymentDate() != null ? res.getPaymentDate() : res.getCreatedAt();
                    long days = ChronoUnit.DAYS.between(baseDate, LocalDateTime.now());
                    if (days < 0) days = 0;
                    RefundPolicyStrategy strategy = refundPolicyFactory.getStrategy(days);
                    RefundResult refundResult = strategy.calculateRefund(res.getDepositAmount(), days);
                    res.setRefundType(refundResult.getPolicyName());
                    res.setRefundAmount(refundResult.getNetRefundAmount());
                    res.setRefundTaxDeduction(refundResult.getTaxDeduction());
                    res.setRefundDate(LocalDateTime.now());
                    res.setRefundNotes(refundResult.getMessage());
                }
            } else {
                res.setRefundType("NONE");
                res.setRefundAmount(0.0);
                res.setRefundTaxDeduction(0.0);
                res.setRefundDate(null);
                res.setRefundNotes("Reservation cancelled before any payment was made. No refund applicable.");
            }

            if (listing.getStatus() == ListingStatus.SOLD || listing.getStatus() == ListingStatus.RESERVED) {
                listing.setStatus(ListingStatus.AVAILABLE);
                listingRepository.save(listing);
            }
            eventPublisher.publishEvent(new ApartmentSalesEvent(
                    this, "PAYMENT_DECLINED", res.getBuyer().getEmail(),
                    "Reservation/Payment for Invoice: " + res.getInvoiceNumber() + " was declined/cancelled. " +
                            (res.getRefundNotes() != null ? res.getRefundNotes() : "")
            ));
        }

        return reservationRepository.save(res);
    }

    // REFUND STRATEGY: PREVIEW CALCULATION (Only eligible if payment has been made)
    public RefundResult calculateRefundPreview(Long id, Long overrideDaysElapsed) {
        PurchaseReservation res = getTransactionById(id);
        boolean hasPaid = res.getPaymentDate() != null
                || res.getStatus() == ReservationStatus.PAYMENT_PENDING
                || res.getStatus() == ReservationStatus.PAYMENT_RECEIVED
                || res.getStatus() == ReservationStatus.CONFIRMED
                || res.getStatus() == ReservationStatus.COMPLETED;

        if (!hasPaid) {
            throw new IllegalStateException("No payment has been made for this reservation. Refunds are only applicable after a payment is made.");
        }

        LocalDateTime baseDate = res.getPaymentDate() != null ? res.getPaymentDate() : res.getCreatedAt();
        long daysElapsed = (overrideDaysElapsed != null) ? overrideDaysElapsed : ChronoUnit.DAYS.between(baseDate, LocalDateTime.now());
        if (daysElapsed < 0) daysElapsed = 0;

        RefundPolicyStrategy strategy = refundPolicyFactory.getStrategy(daysElapsed);
        return strategy.calculateRefund(res.getDepositAmount(), daysElapsed);
    }

    // CRUD 4: DELETE / CANCEL RESERVATION WITH REFUND POLICY STRATEGY
    public PurchaseReservation cancelReservation(Long id, boolean isAdmin, Long overrideDaysElapsed) {
        PurchaseReservation res = getTransactionById(id);
        if (res.getStatus() == ReservationStatus.CANCELLED) {
            return res;
        }

        // Module 4.2: Prevent buyer unilateral cancellation after settlement / full confirmation
        if (!isAdmin && (res.getStatus() == ReservationStatus.CONFIRMED || res.getStatus() == ReservationStatus.PAYMENT_RECEIVED || res.getStatus() == ReservationStatus.COMPLETED)) {
            throw new IllegalStateException("Unilateral cancellation is not permitted for verified, confirmed, or completed acquisitions. Please contact system administration for formal conveyancing dispute resolution.");
        }

        boolean hasPaid = res.getPaymentDate() != null
                || res.getStatus() == ReservationStatus.PAYMENT_PENDING
                || res.getStatus() == ReservationStatus.PAYMENT_RECEIVED
                || res.getStatus() == ReservationStatus.CONFIRMED
                || res.getStatus() == ReservationStatus.COMPLETED;

        // If buyer hasn't made any payment, cancel directly without refund
        if (!hasPaid) {
            res.setStatus(ReservationStatus.CANCELLED);
            res.setRefundType("NONE");
            res.setRefundAmount(0.0);
            res.setRefundTaxDeduction(0.0);
            res.setRefundDate(null);
            res.setRefundNotes("Reservation cancelled before any payment was made. No refund applicable.");
            res.setUpdatedAt(LocalDateTime.now());

            ApartmentListing listing = res.getListing();
            if (listing.getStatus() == ListingStatus.SOLD || listing.getStatus() == ListingStatus.RESERVED) {
                listing.setStatus(ListingStatus.AVAILABLE);
                listingRepository.save(listing);
            }

            eventPublisher.publishEvent(new ApartmentSalesEvent(
                    this, "RESERVATION_CANCELLED_NO_PAYMENT", res.getBuyer().getEmail(),
                    String.format("Reservation %s cancelled prior to payment. Apartment released to available. No refund applicable.", res.getInvoiceNumber())
            ));

            return reservationRepository.save(res);
        }

        // Buyer HAS made payment: Apply GoF Refund Policy Strategy
        LocalDateTime baseDate = res.getPaymentDate() != null ? res.getPaymentDate() : res.getCreatedAt();
        long daysElapsed = (overrideDaysElapsed != null) ? overrideDaysElapsed : ChronoUnit.DAYS.between(baseDate, LocalDateTime.now());
        if (daysElapsed < 0) daysElapsed = 0;

        // Policy Rule: "After 1 week there is no going back , no returns"
        if (daysElapsed > 7 && !isAdmin) {
            throw new IllegalStateException("The 7-day cancellation window has expired. Under the strict refund policy, reservations cannot be refunded or returned after 1 week (no returns / no going back).");
        }

        RefundPolicyStrategy strategy = refundPolicyFactory.getStrategy(daysElapsed);
        RefundResult refundResult = strategy.calculateRefund(res.getDepositAmount(), daysElapsed);

        res.setStatus(ReservationStatus.CANCELLED);
        res.setRefundType(refundResult.getPolicyName());
        res.setRefundAmount(refundResult.getNetRefundAmount());
        res.setRefundTaxDeduction(refundResult.getTaxDeduction());
        res.setRefundDate(LocalDateTime.now());
        res.setRefundNotes(refundResult.getMessage());
        res.setUpdatedAt(LocalDateTime.now());

        // Release apartment back to available if reserved or sold
        ApartmentListing listing = res.getListing();
        if (listing.getStatus() == ListingStatus.SOLD || listing.getStatus() == ListingStatus.RESERVED) {
            listing.setStatus(ListingStatus.AVAILABLE);
            listingRepository.save(listing);
        }

        eventPublisher.publishEvent(new ApartmentSalesEvent(
                this, "RESERVATION_CANCELLED_REFUND", res.getBuyer().getEmail(),
                String.format("Reservation %s cancelled. %s (Net refund: LKR %,.2f, Tax withheld: LKR %,.2f)",
                        res.getInvoiceNumber(), refundResult.getMessage(), refundResult.getNetRefundAmount(), refundResult.getTaxDeduction())
        ));

        return reservationRepository.save(res);
    }

    public void cancelReservation(Long id) {
        cancelReservation(id, false, null);
    }

    public void deleteTransaction(Long id) {
        PurchaseReservation res = getTransactionById(id);
        ApartmentListing listing = res.getListing();
        reservationRepository.delete(res);
        if (listing != null) {
            boolean hasOtherActive = reservationRepository.existsByListingAndStatusIn(
                    listing,
                    ApartmentListingService.ACTIVE_RESERVATION_STATUSES
            );
            if (!hasOtherActive && (listing.getStatus() == ListingStatus.SOLD || listing.getStatus() == ListingStatus.RESERVED)) {
                listing.setStatus(ListingStatus.AVAILABLE);
                listing.setUpdatedAt(LocalDateTime.now());
                listingRepository.save(listing);
            }
        }
    }
}
