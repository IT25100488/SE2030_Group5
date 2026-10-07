package com.sliit.se2030.apartmentsales.repository;

import com.sliit.se2030.apartmentsales.model.*;

import com.sliit.se2030.apartmentsales.model.ApartmentListing;
import com.sliit.se2030.apartmentsales.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseReservationRepository extends JpaRepository<PurchaseReservation, Long> {
    List<PurchaseReservation> findByBuyer(User buyer);
    List<PurchaseReservation> findByListing(ApartmentListing listing);
    List<PurchaseReservation> findByListingSeller(User seller);
    List<PurchaseReservation> findByListingAgent(User agent);
    @org.springframework.data.jpa.repository.Query("SELECT r FROM PurchaseReservation r WHERE r.listing.seller = :user OR r.listing.agent = :user")
    List<PurchaseReservation> findByListingSellerOrAgent(@org.springframework.data.repository.query.Param("user") User user);
    List<PurchaseReservation> findByStatus(ReservationStatus status);
    Optional<PurchaseReservation> findByInvoiceNumber(String invoiceNumber);
    boolean existsByBuyerAndListingAndStatusIn(User buyer, ApartmentListing listing, java.util.Collection<ReservationStatus> statuses);
    boolean existsByListingAndStatusIn(ApartmentListing listing, java.util.Collection<ReservationStatus> statuses);
    boolean existsByListing(ApartmentListing listing);
    List<PurchaseReservation> findByListingAndStatusIn(ApartmentListing listing, java.util.Collection<ReservationStatus> statuses);
}
