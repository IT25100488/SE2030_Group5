package com.sliit.se2030.apartmentsales.dto;

import com.sliit.se2030.apartmentsales.model.*;

import jakarta.validation.constraints.NotBlank;

public class SupportTicketDTO {

    @NotBlank(message = "Subject is required")
    private String subject;

    private String category = "GENERAL";

    private TicketPriority priority = TicketPriority.MEDIUM;

    private TicketStatus status = TicketStatus.OPEN;

    @NotBlank(message = "Message is required")
    private String message;

    private String staffResponse;

    private Long listingId;

    public SupportTicketDTO() {}

    public Long getListingId() { return listingId; }
    public void setListingId(Long listingId) { this.listingId = listingId; }

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
}
