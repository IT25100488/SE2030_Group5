package com.sliit.se2030.apartmentsales.repository;

import com.sliit.se2030.apartmentsales.model.ApartmentListing;
import com.sliit.se2030.apartmentsales.model.PropertyInquiry;
import com.sliit.se2030.apartmentsales.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PropertyInquiryRepository extends JpaRepository<PropertyInquiry, Long> {
    List<PropertyInquiry> findByBuyer(User buyer);
    List<PropertyInquiry> findByListing(ApartmentListing listing);
}
