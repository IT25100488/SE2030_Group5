package com.sliit.se2030.apartmentsales.dto;

import com.sliit.se2030.apartmentsales.model.*;

import jakarta.validation.constraints.*;

public class ApartmentListingDTO {

    @NotBlank(message = "Title cannot be blank")
    @Size(min = 5, max = 150)
    private String title;

    @NotBlank(message = "Description cannot be blank")
    private String description;

    @NotBlank(message = "Property type is required")
    private String propertyType;

    @Positive(message = "Price must be greater than zero")
    private double price;

    @Positive(message = "Size in sqft must be greater than zero")
    private double sizeSqft;

    @Min(value = 1, message = "At least 1 bedroom required")
    private int bedrooms;

    @Min(value = 1, message = "At least 1 bathroom required")
    private int bathrooms;

    @NotBlank(message = "Address is required")
    private String address;

    @NotBlank(message = "City is required")
    private String city;

    private String district;

    private ListingStatus status = ListingStatus.AVAILABLE;

    private String amenities;

    private String imageUrl;

    private Long agentId;

    private Long sellerId;

    public ApartmentListingDTO() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getPropertyType() { return propertyType; }
    public void setPropertyType(String propertyType) { this.propertyType = propertyType; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public double getSizeSqft() { return sizeSqft; }
    public void setSizeSqft(double sizeSqft) { this.sizeSqft = sizeSqft; }

    public int getBedrooms() { return bedrooms; }
    public void setBedrooms(int bedrooms) { this.bedrooms = bedrooms; }

    public int getBathrooms() { return bathrooms; }
    public void setBathrooms(int bathrooms) { this.bathrooms = bathrooms; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public ListingStatus getStatus() { return status; }
    public void setStatus(ListingStatus status) { this.status = status; }

    public String getAmenities() { return amenities; }
    public void setAmenities(String amenities) { this.amenities = amenities; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Long getAgentId() { return agentId; }
    public void setAgentId(Long agentId) { this.agentId = agentId; }

    public Long getSellerId() { return sellerId; }
    public void setSellerId(Long sellerId) { this.sellerId = sellerId; }
}
