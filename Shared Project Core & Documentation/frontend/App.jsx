import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import Module1Listings from './components/Module1Listings';
import Module2Search from './components/Module2Search';
import Module3Viewings from './components/Module3Viewings';
import Module4Transactions from './components/Module4Transactions';
import Module5Support from './components/Module5Support';
import Module6Admin from './components/Module6Admin';
import GuestHome from './components/GuestHome';
import AuthModal from './components/AuthModal';
import AdminLoginModal from './components/AdminLoginModal';
import UserProfileModal from './components/UserProfileModal';
import { ScheduleViewingModal, PurchaseReservationModal } from './components/BookingModals';
import ConfirmDialog from './components/ConfirmDialog';
import { getStoredUser, setAuthToken, setStoredUser, api } from './api';
import { isSandboxActive, setSandboxActive, clearSandboxData } from './sandboxService';
import { Bell, Building2, Mail, Phone, MapPin, CheckCircle2, XCircle, ShieldCheck, ExternalLink, X, Heart, Search, Calendar, FileText, LifeBuoy, Info, Sparkles, TestTube2 } from 'lucide-react';

export default function App() {
  const isAnyAdmin = (u) => ['ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'].includes(u?.role);
  const isMainAdmin = (u) => u?.role === 'ADMIN';

  // Guests land on the public home page; signed-in users keep the search view.
  const [activeTab, setActiveTab] = useState(getStoredUser() ? 'search' : 'home');
  // One-shot filter preset handed from the guest home page to the search module.
  const [searchPreset, setSearchPreset] = useState(null);
  const [searchPresetNonce, setSearchPresetNonce] = useState(0);
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [adminMode, setAdminMode] = useState(isAnyAdmin(getStoredUser()));
  const [isSandboxMode, setIsSandboxMode] = useState(isSandboxActive());
  const [adminTab, setAdminTab] = useState('overview');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [searchCityFilter, setSearchCityFilter] = useState('');
  const [legalModal, setLegalModal] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const confirmResolverRef = React.useRef(null);

  // Modals for property actions
  const [viewingListing, setViewingListing] = useState(null);
  const [purchaseListing, setPurchaseListing] = useState(null);

  const showToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, type === 'error' ? 6000 : 4000);
  };

  const confirmAction = (message, opts = {}) => {
    return new Promise((resolve) => {
      confirmResolverRef.current = resolve;
      setConfirmState({ message, ...opts });
    });
  };

  const resolveConfirm = (result) => {
    setConfirmState(null);
    if (confirmResolverRef.current) {
      confirmResolverRef.current(result);
      confirmResolverRef.current = null;
    }
  };

  const loadAnnouncements = () => {
    api.getPublicAnnouncements()
      .then((res) => setAnnouncements(res || []))
      .catch(() => { });
  };

  useEffect(() => {
    loadAnnouncements();

    const checkAdminHash = () => {
      if (
        window.location.hash === '#admin' ||
        window.location.hash === '#admin-login' ||
        window.location.search.includes('admin=true')
      ) {
        setAdminLoginOpen(true);
      }
    };
    checkAdminHash();
    window.addEventListener('hashchange', checkAdminHash);
    return () => window.removeEventListener('hashchange', checkAdminHash);
  }, []);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (isAnyAdmin(user)) {
      setAdminMode(true);
      setAdminTab('overview');
    } else {
      setAdminMode(false);
      setActiveTab('search');
      setSearchCityFilter('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSignOut = () => {
    setAuthToken(null);
    setStoredUser(null);
    setCurrentUser(null);
    setAdminMode(false);
    setActiveTab('home');
    setSearchCityFilter('');
    setSearchPreset(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Signed out successfully');
  };

  const handleExitAdminPanel = () => {
    setAuthToken(null);
    setStoredUser(null);
    setCurrentUser(null);
    setAdminMode(false);
    setActiveTab('home');
    setSearchCityFilter('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFooterLocationClick = (cityName) => {
    setSearchPreset(null);
    setSearchCityFilter(cityName);
    setActiveTab('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Filtering prime residences in ${cityName}`);
  };

  const handleFooterNavClick = (tabId) => {
    setSearchPreset(null);
    if (tabId === 'search') setSearchCityFilter('');
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [homeResetKey, setHomeResetKey] = useState(0);

  const handleGoHome = () => {
    if (isAdmin && adminMode) {
      setAdminMode(false);
      setSandboxActive(false);
      setIsSandboxMode(false);
      showToast('Returned to Homepage View.');
    }
    setActiveTab(currentUser ? 'search' : 'home');
    setSearchCityFilter('');
    setSearchPreset(null);
    setViewingListing(null);
    setPurchaseListing(null);
    setLegalModal(null);
    setAuthModalOpen(false);
    setAdminLoginOpen(false);
    setProfileModalOpen(false);
    setHomeResetKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isAdmin = isAnyAdmin(currentUser);

  // --- Guest home page routing helpers (reuse the same flows as the rest of the app) ---
  const navigateTab = (tabId) => {
    setSearchPreset(null);
    setActiveTab(tabId);
  };

  const openSearchWithPreset = (preset = {}) => {
    setSearchCityFilter(preset.city || '');
    setSearchPreset({
      keyword: preset.keyword || '',
      propertyType: preset.propertyType || '',
      maxPrice: preset.maxPrice || '',
      listingId: preset.listingId || null
    });
    setSearchPresetNonce((n) => n + 1);
    setActiveTab('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const requireBuyerSignIn = (message) => {
    showToast(message, 'error');
    setAuthModalOpen(true);
  };

  const handleGuestSell = () => {
    if (currentUser && ['SELLER', 'AGENT', 'ADMIN'].includes(currentUser.role)) {
      navigateTab('listings');
      return;
    }
    showToast('Register as an Owner or Real Estate Agent to list an apartment.');
    setAuthModalOpen(true);
  };

  // --- SEPARATE ADMIN VIEW: Dedicated Back-Office shell with sidebar navigation ---
  if (isAdmin && adminMode) {
    return (
      <AdminLayout
        currentUser={currentUser}
        adminTab={adminTab}
        setAdminTab={setAdminTab}
        onLogout={handleSignOut}
        onGoHome={handleGoHome}
        onSwitchRole={() => {
          setAdminMode(false);
          setSandboxActive(true);
          setIsSandboxMode(true);
          setActiveTab('search');
          setSearchCityFilter('');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          showToast('Customer View activated with Fake Purchasing Sandbox mode enabled.');
        }}
      >
        <Module6Admin
          currentUser={currentUser}
          showToast={showToast}
          confirmAction={confirmAction}
          onAnnouncementChange={loadAnnouncements}
          adminTab={adminTab}
          setAdminTab={setAdminTab}
          initialTab={adminTab}
        />

        {/* Floating Toast Notification Container */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}
              style={toast.type === 'error' ? { borderLeft: '4px solid #dc2626', backgroundColor: '#fef2f2', color: '#991b1b', boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.2)' } : undefined}
            >
              {toast.type === 'error'
                ? <XCircle size={18} color="#dc2626" />
                : <CheckCircle2 size={18} color="#10b981" />}
              <span style={toast.type === 'error' ? { color: '#991b1b', fontWeight: 600 } : undefined}>{toast.message}</span>
            </div>
          ))}
        </div>
        <ConfirmDialog state={confirmState} onResolve={resolveConfirm} />
      </AdminLayout>
    );
  }

  // --- SEPARATE CUSTOMER VIEW: The consumer-facing shell for guests, buyers, sellers, and agents ---
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-page)' }}>
      {/* Navigation Bar with Notification Bell & Dropdown */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigateTab}
        onGoHome={handleGoHome}
        currentUser={currentUser}
        setCurrentUser={(u) => {
          setCurrentUser(u);
          if (isAnyAdmin(u)) setAdminMode(true);
          else setAdminMode(false);
        }}
        onLogout={handleSignOut}
        openAuthModal={() => setAuthModalOpen(true)}
        showToast={showToast}
        announcements={announcements}
        onEnterAdminPanel={() => {
          setAdminMode(true);
          setSandboxActive(false);
          setIsSandboxMode(false);
        }}
        onOpenProfile={() => setProfileModalOpen(true)}
      />

      {/* Top Banner when Admin is Previewing Customer View in Sandbox Mode */}
      {isSandboxMode && isAdmin && (
        <div style={{
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #334155',
          color: '#e2e8f0',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          position: 'sticky',
          top: '63px',
          zIndex: 90,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
            <span style={{
              background: '#f59e0b',
              color: '#0f172a',
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: 800,
              fontSize: '0.72rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <TestTube2 size={13} /> ADMIN SANDBOX PREVIEW
            </span>
            <span>
              You are in <strong>Simulated Customer Mode</strong>. You can test reservations, deposit & settlement payments, tour viewings, and customer inquiries. <strong>Zero records will be written to the database.</strong>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                clearSandboxData();
                showToast('Simulated purchases and sandbox data cleared.');
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#cbd5e1',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              Clear Test Data
            </button>
            <button
              type="button"
              onClick={() => {
                setAdminMode(true);
                setSandboxActive(false);
                setIsSandboxMode(false);
              }}
              style={{
                background: '#0284c7',
                border: 'none',
                color: '#ffffff',
                padding: '5px 14px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0369a1'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#0284c7'}
            >
              Return to Admin Panel →
            </button>
          </div>
        </div>
      )}

      {/* Main Content Body */}
      <main style={{ flex: 1 }}>
        {activeTab === 'home' && (
          <GuestHome
            announcements={announcements}
            onSearch={openSearchWithPreset}
            onOpenListing={(listing) => listing && openSearchWithPreset({ listingId: listing.id })}
            onFilterCity={handleFooterLocationClick}
            onNavigate={handleFooterNavClick}
            onOpenAuth={() => setAuthModalOpen(true)}
            onRequireBuyer={requireBuyerSignIn}
            onSell={handleGuestSell}
            onJoinAgent={() => {
              showToast('Choose "Real Estate Agent" when you register to join as an agent.');
              setAuthModalOpen(true);
            }}
            onNewsletter={(email) => {
              showToast(`Register with ${email}, then save a search to switch on new-listing alerts.`);
              setAuthModalOpen(true);
            }}
            onOpenLegal={setLegalModal}
            onOpenAdminPortal={() => setAdminLoginOpen(true)}
          />
        )}

        {(activeTab === 'search' || activeTab === 'favorites') && (
          <Module2Search
            onBookViewing={(listing) => {
              if (!currentUser) {
                showToast('Please sign in as a Buyer to schedule a private tour.', 'error');
                setAuthModalOpen(true);
                return;
              }
              if (currentUser.role !== 'BUYER') {
                showToast('Tour scheduling is available exclusively for registered Buyers.', 'error');
                return;
              }
              setViewingListing(listing);
            }}
            onStartPurchase={(listing) => {
              if (!currentUser) {
                showToast('Please sign in as a Buyer to reserve an apartment.', 'error');
                setAuthModalOpen(true);
                return;
              }
              if (currentUser.role !== 'BUYER') {
                showToast('Apartment reservations are available exclusively for registered Buyers.', 'error');
                return;
              }
              setPurchaseListing(listing);
            }}
            showToast={showToast}
            initialFavoritesOnly={activeTab === 'favorites'}
            initialCity={searchCityFilter}
            initialKeyword={searchPreset?.keyword || ''}
            initialPropertyType={searchPreset?.propertyType || ''}
            initialMaxPrice={searchPreset?.maxPrice || ''}
            initialListingId={searchPreset?.listingId || null}
            key={`${activeTab}-${searchCityFilter}-${homeResetKey}-${searchPresetNonce}`}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'listings' && (
          <Module1Listings
            currentUser={currentUser}
            showToast={showToast}
            confirmAction={confirmAction}
          />
        )}

        {activeTab === 'viewings' && (
          <Module3Viewings
            currentUser={currentUser}
            showToast={showToast}
            confirmAction={confirmAction}
          />
        )}

        {activeTab === 'transactions' && (
          currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT' ? (
            <div className="clean-card" style={{ maxWidth: '820px', margin: '60px auto', padding: '44px 36px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.5rem' }}>
                🛡️
              </div>
              <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '8px', fontWeight: 800 }}>
                Purchases & Invoices: Buyer Access Only
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '580px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                Apartment reservations, purchase offers, and reservation invoices are exclusively reserved for Buyers. As a registered {currentUser?.role === 'SELLER' ? 'Seller' : 'Real Estate Agent'}, you cannot reserve or buy apartments in the system.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button
                  onClick={() => setActiveTab('listings')}
                  className="btn-primary"
                  style={{ padding: '10px 22px' }}
                >
                  View My Properties & Sold History
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className="btn-secondary"
                  style={{ padding: '10px 20px' }}
                >
                  Explore Residences
                </button>
              </div>
            </div>
          ) : (
            <Module4Transactions
              currentUser={currentUser}
              showToast={showToast}
              confirmAction={confirmAction}
            />
          )
        )}

        {activeTab === 'support' && (
          <Module5Support
            currentUser={currentUser}
            openAuthModal={() => setAuthModalOpen(true)}
            showToast={showToast}
            confirmAction={confirmAction}
          />
        )}

        {activeTab === 'contact' && (
          <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h1 style={{ fontSize: '2.4rem', color: '#0f172a', fontWeight: 800, marginBottom: '10px' }}>
                Get In Touch With Us
              </h1>
              <p style={{ color: '#64748b', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
                Have questions regarding luxury apartments, property viewings, or investments? Our real estate specialists are here to assist.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              {/* Office Location */}
              <div className="clean-card" style={{ padding: '28px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <MapPin size={22} color="#2563eb" />
                </div>
                <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '8px', fontWeight: 700 }}>Head Office</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Level 18, Marina Tower, Janadhipathi Mawatha,<br />Colombo 01, Sri Lanka
                </p>
              </div>

              {/* Direct Phone */}
              <div className="clean-card" style={{ padding: '28px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Phone size={22} color="#059669" />
                </div>
                <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '8px', fontWeight: 700 }}>Phone Inquiries</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  Hotline: <strong>+94 11 234 5678</strong><br />
                  Mobile: <strong>+94 77 839 2401</strong>
                </p>
              </div>

              {/* Email Support */}
              <div className="clean-card" style={{ padding: '28px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <Mail size={22} color="#d97706" />
                </div>
                <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '8px', fontWeight: 700 }}>Email Advisory</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                  General: inquiries@propertyflow.lk<br />
                  Sales: sales@propertyflow.lk
                </p>
              </div>
            </div>

            {/* Quick Inquiry Card */}
            <div className="clean-card" style={{ padding: '36px', maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '8px', fontWeight: 700 }}>Schedule a Consultation</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
                Create a free account to book private viewing tours or reserve residences online.
              </p>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="btn-primary"
                style={{ padding: '12px 28px', fontSize: '0.92rem' }}
              >
                Sign In / Register Now
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Modals */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          setStoredUser(updated);
        }}
        onAccountDeleted={handleSignOut}
        showToast={showToast}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        showToast={showToast}
      />

      <AdminLoginModal
        isOpen={adminLoginOpen}
        onClose={() => setAdminLoginOpen(false)}
        onSuccess={(adminUser) => {
          setCurrentUser(adminUser);
          setAdminMode(true);
          setAdminTab('overview');
          setAdminLoginOpen(false);
        }}
        showToast={showToast}
      />

      <ScheduleViewingModal
        listing={viewingListing}
        isOpen={!!viewingListing}
        onClose={() => setViewingListing(null)}
        onSuccess={() => {
          showToast('Viewing appointment booked successfully!');
          setActiveTab('viewings');
        }}
        showToast={showToast}
      />

      <PurchaseReservationModal
        listing={purchaseListing}
        isOpen={!!purchaseListing}
        currentUser={currentUser}
        onClose={() => setPurchaseListing(null)}
        onSuccess={() => {
          showToast('Reservation created! Complete your deposit payment.');
          setActiveTab('transactions');
        }}
        showToast={showToast}
      />

      {/* Clean Luxury Commercial Footer (Compact & Fully Interactive) */}
      {activeTab !== 'home' && (
      <footer style={{
        backgroundColor: '#0b192c',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '44px 32px 24px',
        marginTop: '48px',
        color: '#cbd5e1',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '30px', marginBottom: '28px' }}>

          {/* Column 1: Brand & Identity */}
          <div>
            <div
              onClick={handleGoHome}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', cursor: 'pointer', width: 'fit-content' }}
              title="Return to Homepage"
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(245, 158, 11, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} color="#f59e0b" />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: '#ffffff', margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>PROPERTY FLOW</h3>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 14px' }}>
              Sri Lanka's premier digital luxury real estate exchange connecting discerning buyers, owners, and accredited brokers.
            </p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '4px 10px', borderRadius: '12px', fontWeight: 700 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span> Verified Secure Transactions
            </span>
          </div>

          {/* Column 2: Featured Locations (Interactive Search Filters) */}
          <div>
            <h4 style={{ fontSize: '0.88rem', color: '#ffffff', marginBottom: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Prime Locations
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.84rem', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <li>
                <a
                  href="#colombo"
                  onClick={(e) => { e.preventDefault(); handleFooterLocationClick('Colombo'); }}
                  style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => e.target.style.color = '#38bdf8'}
                  onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                >
                  Colombo — Oceanfront & Cinnamon Gardens
                </a>
              </li>
              <li>
                <a
                  href="#rajagiriya"
                  onClick={(e) => { e.preventDefault(); handleFooterLocationClick('Rajagiriya'); }}
                  style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => e.target.style.color = '#38bdf8'}
                  onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                >
                  Rajagiriya — Waterside Luxury Suites
                </a>
              </li>
              <li>
                <a
                  href="#kandy"
                  onClick={(e) => { e.preventDefault(); handleFooterLocationClick('Kandy'); }}
                  style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => e.target.style.color = '#38bdf8'}
                  onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                >
                  Kandy — Mountain View Condominiums
                </a>
              </li>
              <li>
                <a
                  href="#bentota"
                  onClick={(e) => { e.preventDefault(); handleFooterLocationClick('Bentota'); }}
                  style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => e.target.style.color = '#38bdf8'}
                  onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                >
                  Bentota & Galle — Coastal Residencies
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Portals & Navigation */}
          <div>
            <h4 style={{ fontSize: '0.88rem', color: '#ffffff', marginBottom: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Quick Navigation
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.84rem', display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <li>
                <a
                  href="#explore"
                  onClick={(e) => { e.preventDefault(); handleFooterNavClick('search'); }}
                  style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => e.target.style.color = '#38bdf8'}
                  onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                >
                  Explore Residences
                </a>
              </li>
              <li>
                <a
                  href="#favourites"
                  onClick={(e) => { e.preventDefault(); handleFooterNavClick('favorites'); }}
                  style={{ color: '#94a3b8', textDecoration: 'none', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => e.target.style.color = '#38bdf8'}
                  onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                >
                  My Favourites Shortlist
                </a>
              </li>

              {(!currentUser || currentUser.role === 'BUYER' || currentUser.role === 'ADMIN') && (
                <li>
                  <a
                    href="#inquiries"
                    onClick={(e) => { e.preventDefault(); handleFooterNavClick('support'); }}
                    style={{ color: '#fbbf24', textDecoration: 'none', fontWeight: 700, transition: 'color 0.15s ease' }}
                    onMouseEnter={(e) => e.target.style.color = '#fde047'}
                    onMouseLeave={(e) => e.target.style.color = '#fbbf24'}
                  >
                    Customer Inquiries Desk →
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Customer Inquiries Contact */}
          <div>
            <h4 style={{ fontSize: '0.88rem', color: '#ffffff', marginBottom: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Inquiries Contact
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.84rem', display: 'flex', flexDirection: 'column', gap: '11px' }}>
              <li>
                <a
                  href="tel:+94112345678"
                  style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => e.target.style.color = '#38bdf8'}
                  onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                >
                  <Phone size={14} color="#f59e0b" /> +94 11 234 5678
                </a>
              </li>
              <li>
                <a
                  href="mailto:inquiries@propertyflow.lk"
                  style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => e.target.style.color = '#38bdf8'}
                  onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                >
                  <Mail size={14} color="#f59e0b" /> inquiries@propertyflow.lk
                </a>
              </li>
              <li>
                <a
                  href="https://maps.google.com/?q=Marina+Tower+Colombo+Sri+Lanka"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#94a3b8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.15s ease' }}
                  onMouseEnter={(e) => e.target.style.color = '#38bdf8'}
                  onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
                >
                  <MapPin size={14} color="#f59e0b" /> Marina Tower, Colombo 01 <ExternalLink size={11} color="#64748b" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with Interactive Legal Links & Admin Portal */}
        <div style={{ maxWidth: '1440px', margin: '0 auto', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', fontSize: '0.8rem', color: '#64748b' }}>
          <span>© 2026 Property Flow. High-Integrity Apartment Sales System.</span>

          <div style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}>
            <a
              href="#privacy"
              onClick={(e) => { e.preventDefault(); setLegalModal('privacy'); }}
              style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => e.target.style.color = '#38bdf8'}
              onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
            >
              Privacy Policy
            </a>
            <a
              href="#terms"
              onClick={(e) => { e.preventDefault(); setLegalModal('terms'); }}
              style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => e.target.style.color = '#38bdf8'}
              onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
            >
              Terms of Service
            </a>
            <a
              href="#brokers"
              onClick={(e) => { e.preventDefault(); setLegalModal('brokers'); }}
              style={{ color: '#94a3b8', textDecoration: 'none', cursor: 'pointer' }}
              onMouseEnter={(e) => e.target.style.color = '#38bdf8'}
              onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
            >
              Broker Directory
            </a>
            <a
              href="#admin"
              onClick={(e) => {
                e.preventDefault();
                setAdminLoginOpen(true);
              }}
              style={{
                color: '#f59e0b',
                textDecoration: 'none',
                cursor: 'pointer',
                fontSize: '0.76rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)'
              }}
              title="System Administration Gateway"
            >
              Administrative Portal →
            </a>
          </div>
        </div>
      </footer>
      )}

      {/* Interactive Legal & Informational Policy Dialog */}
      {legalModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} color="#0f294a" />
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-main)', margin: 0, fontWeight: 800 }}>
                  {legalModal === 'privacy' && 'Property Flow Privacy Policy'}
                  {legalModal === 'terms' && 'Conveyancing Terms of Service'}
                  {legalModal === 'brokers' && 'Accredited Broker Directory'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {legalModal === 'privacy' && (
                <>
                  <p style={{ margin: 0 }}>
                    We prioritize client privacy in high-value transactions. All identity verification records, KYC documentation, and purchase inquiries are encrypted under bank-grade protocols.
                  </p>
                  <p style={{ margin: 0 }}>
                    Your personal information is never sold or shared with external marketing entities and is utilized strictly for deed conveyancing and viewing tour validation.
                  </p>
                </>
              )}

              {legalModal === 'terms' && (
                <>
                  <p style={{ margin: 0 }}>
                    All property reservations and payments made through Property Flow comply with statutory Sri Lankan conveyancing and property laws.
                  </p>
                  <p style={{ margin: 0 }}>
                    A statutory 10% deposit establishes a legally binding priority hold on the selected apartment unit, subject to deed clearance and mortgage facility verification.
                  </p>
                </>
              )}

              {legalModal === 'brokers' && (
                <>
                  <p style={{ margin: 0 }}>
                    Our network comprises licensed RICS-accredited real estate professionals across Colombo, Kandy, and southern coastal provinces.
                  </p>
                  <p style={{ margin: 0 }}>
                    Every listing is inspected and backed by freehold clear deeds, Condominium Management Authority (CMA) approvals, and audited floor plans.
                  </p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.84rem' }}
              >
                Close Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}
            style={toast.type === 'error' ? { borderLeft: '4px solid #dc2626', backgroundColor: '#fef2f2', color: '#991b1b', boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.2)' } : undefined}
          >
            {toast.type === 'error'
              ? <XCircle size={18} color="#dc2626" />
              : <CheckCircle2 size={18} color="#10b981" />}
            <span style={toast.type === 'error' ? { color: '#991b1b', fontWeight: 600 } : undefined}>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* In-app replacement for window.confirm() — shared by all modules */}
      <ConfirmDialog state={confirmState} onResolve={resolveConfirm} />
    </div>
  );
}
