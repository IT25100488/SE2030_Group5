package com.sliit.se2030.apartmentsales.dto;

import com.sliit.se2030.apartmentsales.model.*;

import jakarta.validation.constraints.NotBlank;

public class SavedSearchDTO {

    @NotBlank(message = "Title is required")
    private String title;

    private String city;
    private Double minPrice;
    private Double maxPrice;
    private Integer bedrooms;
    private String propertyType;
    private boolean notifyEmail = true;

    public SavedSearchDTO() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public Double getMinPrice() { return minPrice; }
    public void setMinPrice(Double minPrice) { this.minPrice = minPrice; }

    public Double getMaxPrice() { return maxPrice; }
    public void setMaxPrice(Double maxPrice) { this.maxPrice = maxPrice; }

    public Integer getBedrooms() { return bedrooms; }
    public void setBedrooms(Integer bedrooms) { this.bedrooms = bedrooms; }

    public String getPropertyType() { return propertyType; }
    public void setPropertyType(String propertyType) { this.propertyType = propertyType; }

    public boolean isNotifyEmail() { return notifyEmail; }
    public void setNotifyEmail(boolean notifyEmail) { this.notifyEmail = notifyEmail; }
}
