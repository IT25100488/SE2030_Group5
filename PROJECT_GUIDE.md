# SE2030 Software Engineering — Viva & Evaluation Defense Guide
**System**: Web-Based Apartment Sales System (Property Flow)  
**Group ID**: `2026-Y2-S1-MLB-B7G2-05`  
**Evaluation Focus**: Architecture, Independent Member CRUD, Applied Design Patterns, Data Validation & Security.

---

## 📑 1. Member-by-Member Evaluation & CRUD Reference

### Member 1: Perera M.C.S. (IT25101644)
- **Module**: Apartment Listing & Inventory Management
- **Package**: `com.sliit.se2030.apartmentsales.module1_listing`
- **Key Entity**: `ApartmentListing.java`
- **Controller**: `ApartmentListingController.java` (`/api/listings`)
- **Service**: `ApartmentListingService.java`
- **CRUD Operations**:
  - **Create**: `POST /api/listings` — Seller/Agent publishes an apartment with price, specs, photos, amenities, and initial status.
  - **Read**: `GET /api/listings` & `GET /api/listings/{id}` — Retrieve full apartment inventory with associated seller/agent details.
  - **Update**: `PUT /api/listings/{id}` & `PATCH /api/listings/{id}/status` — Modify listing details or change inventory status (`AVAILABLE` -> `RESERVED` -> `SOLD`).
  - **Delete**: `DELETE /api/listings/{id}` — Permanently remove an apartment from the database.
- **Viva Answer Tip**: *"My module manages the supply side of the real-estate ecosystem. I built complete CRUD operations with Jakarta Bean Validation (`@NotBlank`, `@Positive`, `@Min`) ensuring high-quality property records before they are visible in discovery."*

---

### Member 2: Rasanjana S.M.Y. (IT25102464)
- **Module**: Property Search & Discovery / Saved Collections
- **Package**: `com.sliit.se2030.apartmentsales.module2_search`
- **Key Entities**: `SavedSearchPreference.java`, `WishlistItem.java`
- **Controller**: `PropertySearchController.java` (`/api/search`)
- **Service**: `PropertySearchService.java`
- **CRUD Operations**:
  - **Discovery**: `GET /api/search?keyword=&city=&minPrice=&maxPrice=&bedrooms=` — Multi-attribute custom JPA query filter.
  - **Create**: `POST /api/search/saved` — Save complex filter criteria as an alert preference; `POST /api/search/wishlist/{listingId}` — Add apartment to favorites.
  - **Read**: `GET /api/search/saved` & `GET /api/search/wishlist` — Retrieve user's saved preferences and saved wishlist collections.
  - **Update**: `PUT /api/search/saved/{id}` — Update price thresholds or alert settings; `PUT /api/search/wishlist/{id}` — Update user notes.
  - **Delete**: `DELETE /api/search/saved/{id}` — Remove saved preference; `DELETE /api/search/wishlist/{id}` — Remove property from wishlist.
- **Viva Answer Tip**: *"My module solves information discovery. I created custom JPQL query predicates to filter properties in real-time, plus a full CRUD preference system so buyers never miss new matching inventory."*

---

### Member 3: Wijebandara G.G.T.D. (IT25103524)
- **Module**: Inquiry & Viewing Management
- **Package**: `com.sliit.se2030.apartmentsales.module3_inquiry`
- **Key Entities**: `ViewingAppointment.java`, `PropertyInquiry.java`
- **Controller**: `ViewingInquiryController.java` (`/api/appointments`, `/api/inquiries`)
- **Service**: `ViewingInquiryService.java`
- **CRUD Operations**:
  - **Create**: `POST /api/appointments` — Schedule a physical viewing with preferred time slot; `POST /api/inquiries` — Submit property inquiry.
  - **Read**: `GET /api/appointments` & `GET /api/appointments/my` — View user's viewing schedule; `GET /api/inquiries` — Read inquiry message history.
  - **Update**: `PUT /api/appointments/{id}` — Reschedule appointment date/time or update status (`CONFIRMED`, `COMPLETED`); `PUT /api/inquiries/{id}/reply` — Post staff/agent reply.
  - **Delete**: `DELETE /api/appointments/{id}` — Cancel viewing appointment; `DELETE /api/inquiries/{id}` — Delete archived inquiry thread.
- **Viva Answer Tip**: *"My module replaces fragmented phone calls with a centralized digital viewing scheduler and inquiry channel, emitting Observer pattern events when appointments are updated."*

---

### Member 4: Diwyanjali C.K. (IT25101426)
- **Module**: Purchase, Reservation & Transactions
- **Package**: `com.sliit.se2030.apartmentsales.module4_transactions`
- **Key Entity**: `PurchaseReservation.java`
- **Controller**: `PurchaseTransactionController.java` (`/api/transactions`)
- **Service**: `PurchaseTransactionService.java`
- **CRUD Operations**:
  - **Create**: `POST /api/transactions` — Submit formal purchase offer, locks apartment, and generates a unique invoice number (`INV-...`).
  - **Read**: `GET /api/transactions`, `GET /api/transactions/{id}`, `GET /api/transactions/invoice/{invoiceNo}` — Fetch transaction records and printable invoices.
  - **Update**: `POST /api/transactions/{id}/pay` — Process deposit payment via chosen financial rail; `PUT /api/transactions/{id}/status` — Advance status (`APPROVED`, `PAYMENT_RECEIVED`, `COMPLETED`).
  - **Delete**: `DELETE /api/transactions/{id}` — Cancel reservation, which automatically releases the apartment status back to `AVAILABLE`.
- **Applied Design Patterns**:
  - **Factory Pattern**:
    - `PaymentProcessorFactory` delegates to `CardPaymentProcessor`, `BankTransferProcessor`, or `SlipUploadProcessor`.
    - `RefundPolicyFactory` resolves refund policy strategies based on days elapsed since reservation.
  - **Strategy Pattern**:
    - `PricingStrategyFactory` applies dynamic pricing algorithms (`StandardPricingStrategy`, `EarlyBirdDiscountStrategy`, `FullCashDiscountStrategy`).
    - `RefundPolicyStrategy` encapsulates refund algorithms (`FullRefundStrategy` for days 0-2 with 100% refund, `PartialRefundStrategy` for days 3-7 with 15% tax deduction, `NoRefundStrategy` after 7 days / 1 week with strict no-returns policy).
- **Viva Answer Tip**: *"My module manages the commercial sales pipeline. I integrated the Factory and Strategy design patterns to calculate promotional rebates, enforce refund window policies with automated tax deductions, and process payments across multiple channels while keeping transaction logs auditable."*

---

### Member 5: Jameela I.R. (IT25103313)
- **Module**: Customer Relationship & Support / Reviews
- **Package**: `com.sliit.se2030.apartmentsales.module5_support`
- **Key Entities**: `SupportTicket.java`, `ApartmentReview.java`
- **Controller**: `SupportReviewController.java` (`/api/support/tickets`, `/api/reviews`)
- **Service**: `SupportReviewService.java`
- **CRUD Operations**:
  - **Create**: `POST /api/support/tickets` — Open a customer support ticket with category and priority; `POST /api/reviews` — Submit a 1-5 star review.
  - **Read**: `GET /api/support/tickets` & `GET /api/support/tickets/my` — Fetch tickets; `GET /api/reviews/listing/{listingId}` — Fetch property ratings.
  - **Update**: `PUT /api/support/tickets/{id}` — Staff responds to ticket and updates status (`IN_PROGRESS`, `RESOLVED`, `CLOSED`); `PUT /api/reviews/{id}` — Edit review.
  - **Delete**: `DELETE /api/support/tickets/{id}` — Delete resolved support ticket; `DELETE /api/reviews/{id}` — Remove customer review.
- **Viva Answer Tip**: *"My module guarantees post-sale customer satisfaction and transparent feedback. It provides complete ticket triage, status lifecycles, and verified user reviews."*

---

### Member 6: Senanayake D.L.S. (IT25100488)
- **Module**: Administration, Reporting & System Management
- **Package**: `com.sliit.se2030.apartmentsales.module6_admin`
- **Key Entities**: `SystemAnnouncement.java`, `AuditLog.java`
- **Controller**: `AdminSystemController.java` (`/api/admin`)
- **Service**: `AdminSystemReportService.java`
- **CRUD Operations**:
  - **Create**: `POST /api/admin/announcements` — Broadcast new platform announcements; `logActivity(...)` — Record security audit trails.
  - **Read**: `GET /api/admin/announcements` & `/public` — View announcements; `GET /api/admin/audit-logs` — Read security audit log; `GET /api/admin/dashboard-stats` — Real-time business KPI aggregation (Revenue, Inventory, Users).
  - **Update**: `PUT /api/admin/announcements/{id}` — Edit announcement content or active/inactive visibility.
  - **Delete**: `DELETE /api/admin/announcements/{id}` — Remove announcement; `DELETE /api/admin/audit-logs/{id}` — Purge individual log entry.
- **Applied Design Patterns**:
  - **Singleton Pattern**: `DatabaseConfigHelper` monitors MySQL connection pool and system health.
- **Viva Answer Tip**: *"My module is the operational backbone. I designed real-time KPI aggregations for executive decision-making, along with audit logging and platform announcement broadcasting."*

---

## 🎯 2. Applied Software Engineering Design Patterns 

1. **Singleton Pattern**:
   - Location: `com.sliit.se2030.apartmentsales.patterns.DatabaseConfigHelper`
   - Justification: Guarantees a single system-wide instance monitors database pool metrics, uptime, and health diagnostics without redundant overhead.

2. **Factory Design Pattern**:
   - Location: `com.sliit.se2030.apartmentsales.patterns.PaymentProcessorFactory` & `com.sliit.se2030.apartmentsales.patterns.RefundPolicyFactory`
   - Justification: Decouples high-level sales reservation and refund logic from specific payment methods (`Card`, `Bank Wire`, `Slip Upload`) and refund policy resolutions. New payment or refund methods can be added without modifying transaction services (Open/Closed Principle).

3. **Strategy Design Pattern**:
   - Location: `com.sliit.se2030.apartmentsales.patterns.PricingStrategy` & `com.sliit.se2030.apartmentsales.patterns.RefundPolicyStrategy`
   - Justification: Encapsulates discount formulas (`StandardPricingStrategy`, `EarlyBirdDiscountStrategy`, `FullCashDiscountStrategy`) and refund calculation policies (`FullRefundStrategy` for days 0-2 with 0% tax, `PartialRefundStrategy` for days 3-7 with 15% tax deduction, `NoRefundStrategy` after 7 days / 1 week with strict no-returns policy), allowing dynamic calculation during checkout and cancellation.

4. **Observer Design Pattern**:
   - Location: `com.sliit.se2030.apartmentsales.patterns.ApartmentSalesEvent`
   - Justification: Decouples core business transactions from notifications, logging, and external alerts using Spring's ApplicationEvent Publisher.

5. **Repository (DAO) Pattern**:
   - Implemented via Spring Data JPA across all 6 modules to decouple domain entities from underlying SQL persistence.
