package com.sliit.se2030.apartmentsales.dto;

import com.sliit.se2030.apartmentsales.model.*;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public class PaymentRequestDTO {

    @Positive(message = "Payment amount must be greater than zero")
    private double amount;

    @NotBlank(message = "Payment method is required")
    private String paymentMethod; // CREDIT_DEBIT_CARD, BANK_TRANSFER, SLIP_UPLOAD

    @NotBlank(message = "Reference / transaction number is required")
    private String referenceNumber;

    public PaymentRequestDTO() {}

    public double getAmount() { return amount; }
    public void setAmount(double amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }
}
