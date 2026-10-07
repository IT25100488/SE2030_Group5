package com.sliit.se2030.apartmentsales.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 120)
    private String actorEmail;

    @Column(nullable = false, length = 60)
    private String action; // CREATE_LISTING, APPROVE_LISTING, BOOK_VIEWING, MAKE_PAYMENT, CANCEL_RESERVATION

    @Column(length = 50)
    private String module;

    @Column(length = 500)
    private String details;

    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    public AuditLog() {}

    public AuditLog(String actorEmail, String action, String module, String details) {
        this.actorEmail = actorEmail;
        this.action = action;
        this.module = module;
        this.details = details;
        this.timestamp = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getActorEmail() { return actorEmail; }
    public void setActorEmail(String actorEmail) { this.actorEmail = actorEmail; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }

    // Compatibility getters for frontend entity / actor mappings
    public String getEntityName() { return module != null ? module : "SYSTEM"; }
    public String getPerformedBy() { return actorEmail != null ? actorEmail : "system"; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
