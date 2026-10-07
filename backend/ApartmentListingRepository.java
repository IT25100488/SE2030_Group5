package com.sliit.se2030.apartmentsales.repository;

import com.sliit.se2030.apartmentsales.model.*;

import com.sliit.se2030.apartmentsales.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApartmentListingRepository extends JpaRepository<ApartmentListing, Long> {
    List<ApartmentListing> findAllByOrderByIdDesc();
    List<ApartmentListing> findByStatus(ListingStatus status);
    List<ApartmentListing> findByStatusOrderByIdDesc(ListingStatus status);
    List<ApartmentListing> findByStatusIn(java.util.Collection<ListingStatus> statuses);
    List<ApartmentListing> findByStatusInOrderByIdDesc(java.util.Collection<ListingStatus> statuses);
    List<ApartmentListing> findBySeller(User seller);
    List<ApartmentListing> findBySellerOrderByIdDesc(User seller);
    List<ApartmentListing> findByAgent(User agent);
    List<ApartmentListing> findByAgentOrderByIdDesc(User agent);
    List<ApartmentListing> findBySellerOrAgentOrderByIdDesc(User seller, User agent);

    @Query("SELECT a FROM ApartmentListing a WHERE (a.seller = :seller OR a.agent = :agent) AND a.status != 'ARCHIVED' ORDER BY a.id DESC")
    List<ApartmentListing> findActiveBySellerOrAgentOrderByIdDesc(@Param("seller") User seller, @Param("agent") User agent);

    @Query("SELECT a FROM ApartmentListing a WHERE a.seller = :seller AND a.status != 'ARCHIVED' ORDER BY a.id DESC")
    List<ApartmentListing> findActiveBySellerOrderByIdDesc(@Param("seller") User seller);

    boolean existsByTitle(String title);
    java.util.Optional<ApartmentListing> findByTitle(String title);

    @Query("SELECT a FROM ApartmentListing a WHERE " +
           "(:city IS NULL OR LOWER(a.city) LIKE LOWER(CONCAT('%', :city, '%'))) AND " +
           "(:minPrice IS NULL OR a.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR a.price <= :maxPrice) AND " +
           "(:bedrooms IS NULL OR a.bedrooms = :bedrooms) AND " +
           "(:propertyType IS NULL OR LOWER(a.propertyType) LIKE LOWER(CONCAT('%', :propertyType, '%'))) AND " +
           "(a.status IN ('AVAILABLE', 'RESERVED')) " +
           "ORDER BY a.id DESC")
    List<ApartmentListing> searchListings(
            @Param("city") String city,
            @Param("minPrice") Double minPrice,
            @Param("maxPrice") Double maxPrice,
            @Param("bedrooms") Integer bedrooms,
            @Param("propertyType") String propertyType
    );
}

