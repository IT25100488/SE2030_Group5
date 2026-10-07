package com.sliit.se2030.apartmentsales.repository;

import com.sliit.se2030.apartmentsales.model.*;

import com.sliit.se2030.apartmentsales.model.ApartmentListing;
import com.sliit.se2030.apartmentsales.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

@Repository
public interface ViewingAppointmentRepository extends JpaRepository<ViewingAppointment, Long> {
    List<ViewingAppointment> findByBuyer(User buyer);
    List<ViewingAppointment> findByAgent(User agent);
    List<ViewingAppointment> findByListingSeller(User seller);
    List<ViewingAppointment> findByListing(ApartmentListing listing);
    List<ViewingAppointment> findByStatus(AppointmentStatus status);

    @Query("SELECT v FROM ViewingAppointment v WHERE v.agent = :agent OR (v.agent IS NULL AND v.status != com.sliit.se2030.apartmentsales.model.AppointmentStatus.COMPLETED) ORDER BY v.createdAt DESC")
    List<ViewingAppointment> findByAgentOrOpen(@Param("agent") User agent);

    long countByAgentAndStatusIn(User agent, Collection<AppointmentStatus> statuses);

    List<ViewingAppointment> findByAgentAndStatusIn(User agent, Collection<AppointmentStatus> statuses);

    boolean existsByBuyerAndListingAndStatus(User buyer, ApartmentListing listing, AppointmentStatus status);

    boolean existsByListingAndAppointmentDateAndAppointmentTimeAndStatusIn(
            ApartmentListing listing,
            LocalDate appointmentDate,
            String appointmentTime,
            Collection<AppointmentStatus> statuses
    );

    long countByBuyerAndStatusIn(User buyer, Collection<AppointmentStatus> statuses);
}
