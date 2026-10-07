package com.sliit.se2030.apartmentsales.model;

import com.sliit.se2030.apartmentsales.model.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

@Entity
@Table(name = "support_tickets")
public class SupportTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "listing_id")
    private ApartmentListing listing;

    @NotBlank(message = "Subject is required")
    @Column(nullable = false, length = 150)
    private String subject;

    @Column(length = 60)
    private String category; // LISTING_INQUIRY, PAYMENT_ISSUE, VIEWING_DISPUTE, TECHNICAL_SUPPORT

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TicketPriority priority = TicketPriority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TicketStatus status = TicketStatus.OPEN;

    @NotBlank(message = "Message cannot be empty")
    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(columnDefinition = "TEXT")
    private String staffResponse;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "responder_id")
    private User responder;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();

    public SupportTicket() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public ApartmentListing getListing() { return listing; }
    public void setListing(ApartmentListing listing) { this.listing = listing; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public TicketPriority getPriority() { return priority; }
    public void setPriority(TicketPriority priority) { this.priority = priority; }

    public TicketStatus getStatus() { return status; }
    public void setStatus(TicketStatus status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getStaffResponse() { return staffResponse; }
    public void setStaffResponse(String staffResponse) { this.staffResponse = staffResponse; }

    public User getResponder() { return responder; }
    public void setResponder(User responder) { this.responder = responder; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
