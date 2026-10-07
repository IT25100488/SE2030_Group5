package com.sliit.se2030.apartmentsales.dto;

import com.sliit.se2030.apartmentsales.model.*;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class PurchaseReservationDTO {

    @NotNull(message = "Listing ID is required")
    private Long listingId;

    private double offerAmount;

    private String pricingPlan = "STANDARD"; // STANDARD, EARLY_BIRD, FULL_CASH

    private String notes;

    public PurchaseReservationDTO() {}

    public Long getListingId() { return listingId; }
    public void setListingId(Long listingId) { this.listingId = listingId; }

    public double getOfferAmount() { return offerAmount; }
    public void setOfferAmount(double offerAmount) { this.offerAmount = offerAmount; }

    public String getPricingPlan() { return pricingPlan; }
    public void setPricingPlan(String pricingPlan) { this.pricingPlan = pricingPlan; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
