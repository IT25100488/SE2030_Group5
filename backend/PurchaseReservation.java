package com.sliit.se2030.apartmentsales.model;

import com.sliit.se2030.apartmentsales.model.ApartmentListing;
import com.sliit.se2030.apartmentsales.model.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;

@Entity
@Table(name = "purchase_reservations")
public class PurchaseReservation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "listing_id", nullable = false)
    private ApartmentListing listing;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @Positive(message = "Offer amount must be positive")
    @Column(nullable = false, updatable = false)
    private double offerAmount;

    @Positive(message = "Deposit amount must be positive")
    @Column(nullable = false, updatable = false)
    private double depositAmount;

    @Column(nullable = false, unique = true, length = 60)
    private String invoiceNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReservationStatus status = ReservationStatus.OFFER_SUBMITTED;

    @Column(length = 50)
    private String paymentMethod; // CREDIT_DEBIT_CARD, BANK_TRANSFER, SLIP_UPLOAD

    @Column(length = 100)
    private String paymentReference;

    @Column(length = 50)
    private String pricingPlan; // STANDARD, EARLY_BIRD, FULL_CASH

    private LocalDateTime paymentDate;

    @Column(length = 500)
    private String notes;

    // Refund Policy Strategy Tracking: FullRefund (0-2d), PartialRefund (3-7d, -15% tax), NoRefund (>7d)
    private Double refundAmount;
    private Double refundTaxDeduction;
    @Column(length = 50)
    private String refundType;
    private LocalDateTime refundDate;
    @Column(length = 500)
    private String refundNotes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();

    public PurchaseReservation() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ApartmentListing getListing() { return listing; }
    public void setListing(ApartmentListing listing) { this.listing = listing; }

    public User getBuyer() { return buyer; }
    public void setBuyer(User buyer) { this.buyer = buyer; }

    public double getOfferAmount() { return offerAmount; }
    public void setOfferAmount(double offerAmount) { this.offerAmount = offerAmount; }

    public double getDepositAmount() { return depositAmount; }
    public void setDepositAmount(double depositAmount) { this.depositAmount = depositAmount; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public String getInvoiceNo() { return invoiceNumber; }
    public void setInvoiceNo(String invoiceNo) { this.invoiceNumber = invoiceNo; }

    public ReservationStatus getStatus() { return status; }
    public void setStatus(ReservationStatus status) { this.status = status; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentReference() { return paymentReference; }
    public void setPaymentReference(String paymentReference) { this.paymentReference = paymentReference; }

    public String getPricingPlan() { return pricingPlan; }
    public void setPricingPlan(String pricingPlan) { this.pricingPlan = pricingPlan; }

    public LocalDateTime getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDateTime paymentDate) { this.paymentDate = paymentDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Double getRefundAmount() { return refundAmount; }
    public void setRefundAmount(Double refundAmount) { this.refundAmount = refundAmount; }

    public Double getRefundTaxDeduction() { return refundTaxDeduction; }
    public void setRefundTaxDeduction(Double refundTaxDeduction) { this.refundTaxDeduction = refundTaxDeduction; }

    public String getRefundType() { return refundType; }
    public void setRefundType(String refundType) { this.refundType = refundType; }

    public LocalDateTime getRefundDate() { return refundDate; }
    public void setRefundDate(LocalDateTime refundDate) { this.refundDate = refundDate; }

    public String getRefundNotes() { return refundNotes; }
    public void setRefundNotes(String refundNotes) { this.refundNotes = refundNotes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
