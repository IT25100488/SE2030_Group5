package com.sliit.se2030.apartmentsales.repository;

import com.sliit.se2030.apartmentsales.model.*;

import com.sliit.se2030.apartmentsales.model.ApartmentListing;
import com.sliit.se2030.apartmentsales.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApartmentReviewRepository extends JpaRepository<ApartmentReview, Long> {
    List<ApartmentReview> findByListing(ApartmentListing listing);
    List<ApartmentReview> findByUser(User user);
}
