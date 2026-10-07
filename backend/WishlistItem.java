package com.sliit.se2030.apartmentsales.model;

import com.sliit.se2030.apartmentsales.model.ApartmentListing;
import com.sliit.se2030.apartmentsales.model.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "wishlist_items")
public class WishlistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "listing_id", nullable = false)
    private ApartmentListing listing;

    @Column(length = 255)
    private String userNotes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime addedAt = LocalDateTime.now();

    public WishlistItem() {}

    public WishlistItem(User user, ApartmentListing listing, String userNotes) {
        this.user = user;
        this.listing = listing;
        this.userNotes = userNotes;
        this.addedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public ApartmentListing getListing() { return listing; }
    public void setListing(ApartmentListing listing) { this.listing = listing; }

    public String getUserNotes() { return userNotes; }
    public void setUserNotes(String userNotes) { this.userNotes = userNotes; }

    public LocalDateTime getAddedAt() { return addedAt; }
    public void setAddedAt(LocalDateTime addedAt) { this.addedAt = addedAt; }
}
