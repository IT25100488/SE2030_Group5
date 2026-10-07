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
@RequestMapping("/api/transactions")
public class PurchaseTransactionController {

    private final PurchaseTransactionService transactionService;

    public PurchaseTransactionController(PurchaseTransactionService transactionService) {
        this.transactionService = transactionService;
    }

    // CRUD: CREATE
    @PostMapping
    public ResponseEntity<PurchaseReservation> createReservation(
            @Valid @RequestBody PurchaseReservationDTO dto,
            Authentication authentication) {
        return ResponseEntity.ok(transactionService.createReservationOffer(dto, authentication.getName()));
    }

    // CRUD: READ ALL (Buyers see only their own; Admin/Staff see all)
    @GetMapping
    public ResponseEntity<List<PurchaseReservation>> getAllTransactions(Authentication authentication) {
        if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> 
                a.getAuthority().equals("ROLE_BUYER") || 
                a.getAuthority().equals("ROLE_SELLER") || 
                a.getAuthority().equals("ROLE_AGENT"))) {
            return ResponseEntity.ok(transactionService.getMyTransactions(authentication.getName()));
        }
        return ResponseEntity.ok(transactionService.getAllTransactions());
    }

    // CRUD: READ BY ID
    @GetMapping("/{id}")
    public ResponseEntity<PurchaseReservation> getTransactionById(@PathVariable Long id, Authentication authentication) {
        PurchaseReservation txn = transactionService.getTransactionById(id);
        if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_BUYER"))) {
            if (!txn.getBuyer().getEmail().equalsIgnoreCase(authentication.getName())) {
                throw new IllegalArgumentException("Access Denied: You cannot view reservations created by other buyers.");
            }
        }
        return ResponseEntity.ok(txn);
    }

    // CRUD: READ MY TRANSACTIONS
    @GetMapping("/my")
    public ResponseEntity<List<PurchaseReservation>> getMyTransactions(Authentication authentication) {
        return ResponseEntity.ok(transactionService.getMyTransactions(authentication.getName()));
    }

    // CRUD: READ BY INVOICE
    @GetMapping("/invoice/{invoiceNumber}")
    public ResponseEntity<PurchaseReservation> getByInvoice(@PathVariable String invoiceNumber) {
        return ResponseEntity.ok(transactionService.getByInvoiceNumber(invoiceNumber));
    }

    // CRUD: UPDATE STATUS
    @PutMapping("/{id}/status")
    public ResponseEntity<PurchaseReservation> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_BUYER"))) {
            throw new org.springframework.security.access.AccessDeniedException("Buyers are not authorized to manually change transaction status. Please proceed with payment or cancellation.");
        }
        String statusStr = body.get("status");
        ReservationStatus status;
        try {
            status = ReservationStatus.valueOf(statusStr != null ? statusStr.toUpperCase().trim() : "");
        } catch (Exception ex) {
            if ("CONFIRMED".equalsIgnoreCase(statusStr) || "APPROVED".equalsIgnoreCase(statusStr)) {
                status = ReservationStatus.CONFIRMED;
            } else if ("CANCELLED".equalsIgnoreCase(statusStr) || "DECLINED".equalsIgnoreCase(statusStr)) {
                status = ReservationStatus.CANCELLED;
            } else {
                throw new IllegalArgumentException("Invalid reservation status: " + statusStr);
            }
        }
        return ResponseEntity.ok(transactionService.updateStatus(id, status));
    }

    // CRUD: PROCESS PAYMENT
    @PostMapping("/{id}/pay")
    public ResponseEntity<PurchaseReservation> processPayment(
            @PathVariable Long id,
            @Valid @RequestBody PaymentRequestDTO paymentDto,
            Authentication authentication) {
        PurchaseReservation txn = transactionService.getTransactionById(id);
        if (authentication != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_BUYER"))) {
            if (!txn.getBuyer().getEmail().equalsIgnoreCase(authentication.getName())) {
                throw new IllegalArgumentException("Access Denied: You cannot process payments for another buyer's reservation.");
            }
        }
        return ResponseEntity.ok(transactionService.processPayment(id, paymentDto));
    }

    // REFUND POLICY STRATEGY PREVIEW (Days 0–2: FullRefund, Days 3–7: PartialRefund -15% tax, >7d: NoRefund)
    @GetMapping("/{id}/refund-preview")
    public ResponseEntity<?> getRefundPreview(@PathVariable Long id,
                                              @RequestParam(required = false) Long testDays) {
        return ResponseEntity.ok(transactionService.calculateRefundPreview(id, testDays));
    }

    // CRUD: DELETE / CANCEL RESERVATION (Applies Refund Strategy)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelReservation(@PathVariable Long id,
                                               @RequestParam(required = false) Long testDays,
                                               Authentication authentication) {
        PurchaseReservation txn = transactionService.getTransactionById(id);
        boolean isAdmin = false;
        if (authentication != null) {
            isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_FINANCE_ADMIN"));
            if (!isAdmin && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_BUYER"))) {
                if (!txn.getBuyer().getEmail().equalsIgnoreCase(authentication.getName())) {
                    throw new IllegalArgumentException("Access Denied: You cannot cancel another buyer's reservation.");
                }
            }
        }

        PurchaseReservation cancelled = transactionService.cancelReservation(id, isAdmin, testDays);
        boolean hadRefund = cancelled.getRefundType() != null && !"NONE".equals(cancelled.getRefundType()) && cancelled.getRefundAmount() != null && cancelled.getRefundAmount() > 0;
        String message = hadRefund 
                ? "Reservation cancelled and refund processed successfully." 
                : "Reservation cancelled. No payment was made, so no refund is applicable.";

        return ResponseEntity.ok(Map.of(
                "message", message,
                "id", id,
                "refundType", cancelled.getRefundType() != null ? cancelled.getRefundType() : "NONE",
                "refundAmount", cancelled.getRefundAmount() != null ? cancelled.getRefundAmount() : 0.0,
                "refundTaxDeduction", cancelled.getRefundTaxDeduction() != null ? cancelled.getRefundTaxDeduction() : 0.0,
                "refundNotes", cancelled.getRefundNotes() != null ? cancelled.getRefundNotes() : "",
                "status", cancelled.getStatus().name()
        ));
    }
}
