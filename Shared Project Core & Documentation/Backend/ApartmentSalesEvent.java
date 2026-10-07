package com.sliit.se2030.apartmentsales.patterns;

import com.sliit.se2030.apartmentsales.model.AuditLog;
import com.sliit.se2030.apartmentsales.repository.AuditLogRepository;
import org.springframework.context.ApplicationEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * OBSERVER DESIGN PATTERN:
 * Leverages Spring's ApplicationEvent mechanism to decouple publishers (who trigger events)
 * from listeners (observers that send notifications, update audit logs, or refresh metrics).
 */
public class ApartmentSalesEvent extends ApplicationEvent {
    private final String eventType;
    private final String recipientEmail;
    private final String details;

    public ApartmentSalesEvent(Object source, String eventType, String recipientEmail, String details) {
        super(source);
        this.eventType = eventType;
        this.recipientEmail = recipientEmail;
        this.details = details;
    }

    public String getEventType() { return eventType; }
    public String getRecipientEmail() { return recipientEmail; }
    public String getDetails() { return details; }
}

@Component
class ApartmentEventSubscriber {

    private final AuditLogRepository auditLogRepository;

    public ApartmentEventSubscriber(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @EventListener
    public void onApartmentSalesEvent(ApartmentSalesEvent event) {
        System.out.println("[OBSERVER PATTERN] Event Triggered -> Type: " + event.getEventType()
                + ", Recipient: " + event.getRecipientEmail()
                + ", Message: " + event.getDetails());

        // The observer now does real work, not just a console line: every
        // cross-module event (a viewing booked, a payment processed, a ticket
        // opened) becomes a durable AuditLog entry the admin panel can see.
        // This is what actually feeds Module 6's "Security & Audit Trail" —
        // previously only Module 6's own announcement actions ever appeared there.
        AuditLog log = new AuditLog(
                event.getRecipientEmail(),
                event.getEventType(),
                inferModule(event.getEventType()),
                event.getDetails()
        );
        auditLogRepository.save(log);
    }

    private String inferModule(String eventType) {
        if (eventType == null) return "SYSTEM";
        if (eventType.startsWith("VIEWING")) return "MODULE_3_INQUIRY_VIEWING";
        if (eventType.startsWith("PURCHASE") || eventType.startsWith("PAYMENT")) return "MODULE_4_TRANSACTIONS";
        if (eventType.startsWith("SUPPORT")) return "MODULE_5_SUPPORT";
        if (eventType.startsWith("ANNOUNCEMENT")) return "MODULE_6_ADMIN";
        return "SYSTEM";
    }
}

