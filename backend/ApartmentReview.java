package com.sliit.se2030.apartmentsales.model;

import com.sliit.se2030.apartmentsales.model.ApartmentListing;
import com.sliit.se2030.apartmentsales.model.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Entity
@Table(name = "apartment_reviews")
public class ApartmentReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "listing_id", nullable = false)
    private ApartmentListing listing;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Min(value = 1, message = "Rating must be at least 1 star")
    @Max(value = 5, message = "Rating cannot exceed 5 stars")
    @Column(nullable = false)
    private int rating;

    @NotBlank(message = "Review comment is required")
    @Column(columnDefinition = "TEXT", nullable = false)
    private String comment;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public ApartmentReview() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ApartmentListing getListing() { return listing; }
    public void setListing(ApartmentListing listing) { this.listing = listing; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
