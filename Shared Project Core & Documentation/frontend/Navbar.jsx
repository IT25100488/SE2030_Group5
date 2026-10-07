import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Building2, House, Search, Calendar, FileText, Home, LifeBuoy, LogOut, User, Phone, Bell, X, CheckCircle, AlertTriangle, ShieldCheck, TestTube2 } from 'lucide-react';
import { api, setAuthToken, setStoredUser } from '../api';
import { isSandboxActive } from '../sandboxService';

export default function Navbar({ activeTab, setActiveTab, onGoHome, currentUser, setCurrentUser, openAuthModal, showToast, announcements = [], onEnterAdminPanel, onOpenProfile, onLogout }) {
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close announcements dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAnnouncementsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      setAuthToken(null);
      setStoredUser(null);
      setCurrentUser(null);
      setActiveTab('search');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (showToast) showToast('Signed out successfully');
    }
  };

  // Role-specific announcements filtering: announcements targeted to a specific role
  // (e.g. SELLER, BUYER, AGENT) are uniquely visible to that role only.
  const userRole = (currentUser?.role || '').toUpperCase();
  const visibleAnnouncements = useMemo(() => {
    if (!currentUser) return [];
    return announcements.filter((item) => {
      if (item.active === false) return false;
      const target = (item.targetRole || 'ALL').toUpperCase();
      if (target === 'ALL') return true;
      if (userRole === 'ADMIN') return true;
      return target === userRole;
    });
  }, [announcements, currentUser, userRole]);

  // Role-based tab access — this is the "User view" side of the admin/user
  // separation: each signed-in role only sees the tabs it actually uses
  // (mirrors the Major Stakeholders / Users mapping from the proposal), and
  // a guest sees just enough to browse and reach out. Admins never hit this
  // component at all — App.jsx routes them straight to <AdminLayout>.
  const ALL_TABS = [
    { id: 'home', label: 'Home', icon: House },
    { id: 'search', label: 'Explore Residences', icon: Search },
    { id: 'viewings', label: 'Viewing Tours', icon: Calendar },
    { id: 'transactions', label: 'Purchases & Invoices', icon: FileText },
    { id: 'listings', label: 'Property Management', icon: Home },
    { id: 'support', label: 'Customer Inquiries', icon: LifeBuoy },
    { id: 'contact', label: 'Contact Us', icon: Phone },
  ];
  const ROLE_TAB_IDS = {
    BUYER: ['search', 'viewings', 'transactions', 'support'],
    SELLER: ['search', 'listings', 'support'],
    AGENT: ['search', 'listings', 'viewings', 'support'],
    FINANCE_ADMIN: ['search', 'viewings', 'transactions'],
    SUPPORT_ADMIN: ['search', 'support'],
    ADMIN: ['search', 'viewings', 'transactions', 'listings', 'support', 'contact']
  };
  const allowedTabIds = currentUser
    ? (ROLE_TAB_IDS[currentUser.role] || ALL_TABS.map((t) => t.id))
    : ['home', 'search', 'support', 'contact'];
  const navItems = ALL_TABS.filter((t) => allowedTabIds.includes(t.id));

  // Whenever authentication state changes (sign in as buyer/agent/seller, or sign out),
  // automatically redirect to the homepage ('search' / Explore Residences)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setActiveTab(currentUser ? 'search' : 'home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  return (
    <header className={`pf-nav ${!currentUser && activeTab === 'home' ? 'pf-nav--light' : ''}`} style={{
      backgroundColor: 'rgba(11, 25, 44, 0.95)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.09)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)'
    }}>
      {/* Main Navigation Bar */}
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        {/* Brand */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => {
            if (onGoHome) {
              onGoHome();
            } else {
              setActiveTab('search');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          title="Return to Homepage"
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #0b192c 0%, #1e3e62 100%)', border: '1px solid rgba(245, 158, 11, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.25)' }}>
            <Building2 size={21} color="#f59e0b" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', margin: 0, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.02em' }}>PROPERTY</h2>
            <p style={{ fontSize: '0.66rem', color: '#fbbf24', letterSpacing: '0.2em', textTransform: 'uppercase', margin: 0, fontWeight: 800 }}>Flow</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={isActive ? 'is-active-tab' : undefined}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '8px 15px',
                  borderRadius: '10px',
                  background: isActive ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.08) 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : '#cbd5e1',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.88rem',
                  border: isActive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.18)' : 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#cbd5e1';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Icon size={15} color={isActive ? '#38bdf8' : '#94a3b8'} />
                <span>{item.label}</span>
                {item.adminOnly && (
                  <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '4px', fontWeight: 700, marginLeft: '2px' }}>
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Section: Notification Bell & Account Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Sandbox Indicator badge if admin preview is active */}
          {isSandboxActive() && (
            <span style={{
              background: '#f59e0b',
              color: '#0f172a',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '0.72rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <TestTube2 size={13} /> Sandbox Active
            </span>
          )}

          {/* Admin Back-Office quick button if Admin logged in */}
          {['ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN'].includes(currentUser?.role) && (
            <button
              onClick={() => onEnterAdminPanel && onEnterAdminPanel()}
              style={{
                background: '#d97706',
                border: 'none',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
              }}
              title="Return to Administrator Back-Office"
            >
              <ShieldCheck size={14} /> Admin Panel
            </button>
          )}

          {/* ANNOUNCEMENTS NOTIFICATION BELL BUTTON WITH DROPDOWN - Only shown when logged in */}
          {currentUser && (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setAnnouncementsOpen(!announcementsOpen)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  background: announcementsOpen ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  cursor: 'pointer'
                }}
                title="View Announcements & Notices"
              >
                <Bell size={18} color={visibleAnnouncements.length > 0 ? '#f59e0b' : '#94a3b8'} />
                {visibleAnnouncements.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(217,119,6,0.4)'
                  }}>
                    {visibleAnnouncements.length}
                  </span>
                )}
              </button>

              {/* Dropdown Panel */}
              {announcementsOpen && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  right: 0,
                  width: '340px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.25)',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bell size={15} color="#d97706" />
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                        Announcements & Notices
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      Live Broadcast
                    </span>
                  </div>

                  <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '10px 14px' }}>
                    {visibleAnnouncements.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.85rem' }}>
                        No active announcements for your role at this time.
                      </div>
                    ) : (
                      visibleAnnouncements.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            padding: '12px 0',
                            borderBottom: '1px solid #f1f5f9'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '0.7rem', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              {item.priority || 'NOTICE'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                              {item.targetRole === 'ALL'
                                ? 'All Members'
                                : item.targetRole === 'BUYER'
                                ? 'Buyers Only'
                                : item.targetRole === 'SELLER'
                                ? 'Sellers Only'
                                : item.targetRole === 'AGENT'
                                ? 'Agents Only'
                                : item.targetRole}
                            </span>
                          </div>
                          <h4 style={{ fontSize: '0.88rem', color: '#0f172a', margin: '2px 0 4px', fontWeight: 700 }}>
                            {item.title}
                          </h4>
                          <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0, lineHeight: 1.4 }}>
                            {item.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Account Profile / Sign In */}
          <div>
            {currentUser ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  onClick={() => onOpenProfile && onOpenProfile()}
                  style={{
                    textAlign: 'right',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    transition: 'background-color 0.15s ease'
                  }}
                  title="Click to view & edit Profile"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                    <User size={13} color="#f59e0b" />
                    {currentUser.fullName}
                  </p>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                    {currentUser.role?.toLowerCase()} account
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  style={{
                    padding: '6px 10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                className="pf-nav__signin"
                onClick={openAuthModal}
                style={{
                  padding: '8px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
