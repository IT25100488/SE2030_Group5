package com.sliit.se2030.apartmentsales.repository;

import com.sliit.se2030.apartmentsales.model.*;

import com.sliit.se2030.apartmentsales.model.ApartmentListing;
import com.sliit.se2030.apartmentsales.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistRepository extends JpaRepository<WishlistItem, Long> {
    List<WishlistItem> findByUser(User user);
    List<WishlistItem> findByListing(ApartmentListing listing);
    Optional<WishlistItem> findByUserAndListing(User user, ApartmentListing listing);
    void deleteByUserAndListing(User user, ApartmentListing listing);
}
