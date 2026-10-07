# PROPERTY FLOW — Web-Based Apartment Sales System
**Module**: SE2030 — Software Engineering  
**Academic Year**: Year 2, Semester 1 (2026)  
**Group ID**: `2026-Y2-S1-MLB-B7G2-05`  

---

##  Group Members & Major Functions (Dedicated CRUD)

Each group member has an independent, fully implemented business module with dedicated **Create, Read, Update, and Delete (CRUD)** operations, JPA repositories, controllers, and services:

| Student ID | Student Name | Assigned Major Function | Primary Entity & CRUD Operations |
| :--- | :--- | :--- | :--- |
| **IT25101644** | **Perera M.C.S.** | **1. Apartment Listing & Inventory** | `ApartmentListing` (Create listing, Read catalog, Update specs & status, Delete listing) |
| **IT25102464** | **Rasanjana S.M.Y.** | **2. Property Search & Discovery / Wishlist** | `SavedSearchPreference` & `WishlistItem` (Search filter engine, CRUD for saved search alerts & wishlist collections) |
| **IT25103524** | **Wijebandara G.G.T.D.** | **3. Inquiry & Viewing Management** | `ViewingAppointment` & `PropertyInquiry` (Book viewings, Read bookings, Reschedule & Confirm, Cancel appointment, Inquiry message threads) |
| **IT25101426** | **Diwyanjali C.K.** | **4. Purchase, Reservation & Transactions** | `PurchaseReservation` (Submit purchase offer, Read sales pipeline, Process payment checkout, Print invoice receipt, Cancel reservation) |
| **IT25103313** | **Jameela I.R.** | **5. Customer Relationship & Support** | `SupportTicket` & `ApartmentReview` (Open support ticket, Read tickets, Staff response & resolution, Star reviews CRUD) |
| **IT25100488** | **Senanayake D.L.S.** | **6. Administration, Reporting & System Management** | `SystemAnnouncement` & `AuditLog` (Broadcast announcements CRUD, Audit logging CRUD, Executive KPI dashboards & revenue reports) |

---

##  System Architecture

```
User Web Browser
       │
       ▼
Presentation Layer (Vite + React SPA / Luxury CSS Design System)
       │ (REST APIs & JWT Bearer Token)
       ▼
Security & Controller Layer (Spring Security 6, JWT Filter, BCrypt)
       │
       ▼
Application Service Layer (Business Logic & Software Engineering Design Patterns)
       │
       ├─► Singleton Pattern: DatabaseConfigHelper (System connection diagnostics)
       ├─► Factory Pattern: PaymentProcessorFactory & RefundPolicyFactory
       ├─► Strategy Pattern: PricingStrategy (Standard, Early Bird 5% Off, Full Cash 2% Off) & RefundPolicyStrategy (Full Days 0-2, Partial 15% Tax Days 3-7, Strict No-Refund > 7 Days)
       ├─► Observer Pattern: ApartmentSalesEvent (Decoupled event notifications)
       └─► Repository / DAO Pattern: Spring Data JPA (Decoupled persistence)
       │
       ▼
Data Layer: MySQL 8.0 Database (apartment_sales_db)
```

---

##  How to Run the Project (Step-by-Step)

### Prerequisites
- **Java 21 LTS**
- **MySQL 8.0** running on default port `3306` (Database: `apartment_sales_db`, password: `12345` or as configured in `backend/src/main/resources/application.properties`)
- **Node.js (v18+)** and **npm**

---

### Step 1: Start the Backend (Spring Boot)
1. Open PowerShell and navigate to the project directory:
   ```powershell
   cd C:\Users\Dumindu\Documents\SE_Project
   ```
2. Run the Spring Boot backend using the included Maven wrapper:
   ```powershell
   $env:JAVA_HOME = "C:\Users\Dumindu\.jdks\ms-21.0.12"
   .\backend\mvnw.cmd -f backend/pom.xml spring-boot:run
   ```
3. The server starts on **`http://localhost:8080`**.
   - Tables are auto-created in MySQL.
   - `DatabaseSeeder` automatically populates realistic initial data for all 6 modules.

---

### Step 2: Start the Frontend (Vite + React)
1. Open a second PowerShell terminal:
   ```powershell
   cd C:\Users\Dumindu\Documents\SE_Project\frontend
   npm run dev
   ```
2. Open your browser and navigate to:
    **`http://localhost:5173`**

---

##  Demo Quick-Login Accounts

You can log in instantly with one click using the Quick-Login buttons on the top banner, or use these credentials:

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **System Administrator (Main)** | `admin@gmail.com` | `Admin@12345` | Full system control, KPIs, Announcements, Audit Logs |
| **System Administrator (Demo)** | `admin@apartments.lk` | `admin123` | Full system control, KPIs, Announcements, Audit Logs |
| **Real Estate Agent** | `agent@apartments.lk` | `agent123` | Manage listings, confirm viewing appointments, reply inquiries |
| **Property Seller (Owner)** | `seller@apartments.lk` | `seller123` | Create & update apartment listings, monitor sales status |
| **Apartment Buyer** | `buyer@apartments.lk` | `buyer123` | Search, filter, wishlist, book viewings, make deposit payments |
| **Support / Finance Staff** | `staff@apartments.lk` | `staff123` | Resolve customer tickets, review invoices and payment receipts |

---

##  Project Structure

```
SE_Project/
├── backend/
│   ├── src/main/java/com/sliit/se2030/apartmentsales/
│   │   ├── config/              # SecurityConfig, JwtTokenProvider, DatabaseSeeder
│   │   ├── user/                # User entity, Role enum, AuthController, UserService
│   │   ├── patterns/            # Singleton, Factory, Strategy, Observer design patterns
│   │   ├── module1_listing/     # Member 1: ApartmentListing CRUD
│   │   ├── module2_search/      # Member 2: PropertySearch, SavedSearches & Wishlist CRUD
│   │   ├── module3_inquiry/     # Member 3: ViewingAppointments & Inquiries CRUD
│   │   ├── module4_transactions/# Member 4: PurchaseReservation, Payments & Invoices CRUD
│   │   ├── module5_support/     # Member 5: SupportTickets & Reviews CRUD
│   │   └── module6_admin/       # Member 6: SystemAnnouncements, AuditLogs & Dashboard KPIs CRUD
│   └── src/main/resources/
│       ├── application.properties
│       └── static/              # Built production frontend assets
├── frontend/
│   ├── src/
│   │   ├── components/          # Navbar, Module components (M1 - M6), Modals
│   │   ├── api.js               # API service client
│   │   ├── App.jsx              # Main App layout & tabs
│   │   └── index.css            # Luxury Real-Estate dark theme design system
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── README.md
└── PROJECT_GUIDE.md             # Detailed Viva & Evaluation preparation guide
```
