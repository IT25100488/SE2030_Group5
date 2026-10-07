package com.sliit.se2030.apartmentsales.repository;

import com.sliit.se2030.apartmentsales.model.*;

import com.sliit.se2030.apartmentsales.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportTicketRepository extends JpaRepository<SupportTicket, Long> {
    List<SupportTicket> findByUser(User user);
    List<SupportTicket> findByResponder(User responder);
    List<SupportTicket> findByStatus(TicketStatus status);
    List<SupportTicket> findByListing(ApartmentListing listing);
    List<SupportTicket> findByCategory(String category);
    List<SupportTicket> findByUserAndCategory(User user, String category);
}
