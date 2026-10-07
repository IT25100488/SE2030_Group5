import React, { useEffect, useMemo } from 'react';
import { LayoutDashboard, LogOut, Building2, ArrowLeftRight, Building, Users, Calendar, Bell, Activity, LifeBuoy, ShieldCheck, Wallet, Headphones, Star } from 'lucide-react';

export default function AdminLayout({ currentUser, onLogout, onSwitchRole, onGoHome, adminTab, setAdminTab, children }) {
  const role = currentUser?.role || 'ADMIN';

  // Role-based Departmental Nav Items:
  // - FINANCE_ADMIN: Executive Overview + Tours & Finance Reservations
  // - SUPPORT_ADMIN: Executive Overview + Customer Inquiries + Apartment Reviews
  // - ADMIN (SuperAdmin): Executive Overview + Listing Moderation + User Roles & Access + Announcements + Audit Trail
  const navItems = useMemo(() => {
    switch (role) {
      case 'FINANCE_ADMIN':
        return [
          { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
          { id: 'viewings', label: 'Tours & Finance Reservations', icon: Calendar },
        ];
      case 'SUPPORT_ADMIN':
        return [
          { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
          { id: 'inquiries', label: 'Customer Inquiries', icon: LifeBuoy },
          { id: 'reviews', label: 'Apartment Reviews', icon: Star },
        ];
      case 'ADMIN':
      default:
        return [
          { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
          { id: 'listings', label: 'Listing Moderation', icon: Building },
          { id: 'users', label: 'User Roles & Access', icon: Users },
          { id: 'inquiries', label: 'Support & Inquiries', icon: LifeBuoy },
          { id: 'announcements', label: 'Announcements', icon: Bell },
          { id: 'audit', label: 'Audit Trail', icon: Activity },
        ];
    }
  }, [role]);

  // Ensure current active tab is authorized for current admin role
  useEffect(() => {
    const allowedIds = navItems.map((n) => n.id);
    if (!allowedIds.includes(adminTab) && setAdminTab) {
      setAdminTab(allowedIds[0] || 'overview');
    }
  }, [navItems, adminTab, setAdminTab]);

  const departmentMeta = useMemo(() => {
    switch (role) {
      case 'FINANCE_ADMIN':
        return {
          subtitle: 'Finance Admin Back-Office',
          color: '#10b981',
          bgBadge: 'rgba(16, 185, 129, 0.15)',
          roleLabel: 'Finance Administrator',
          Icon: Wallet
        };
      case 'SUPPORT_ADMIN':
        return {
          subtitle: 'Support Admin Back-Office',
          color: '#38bdf8',
          bgBadge: 'rgba(56, 189, 248, 0.15)',
          roleLabel: 'Customer Support Administrator',
          Icon: Headphones
        };
      case 'ADMIN':
      default:
        return {
          subtitle: 'Super Admin Back-Office',
          color: '#f59e0b',
          bgBadge: 'rgba(245, 158, 11, 0.15)',
          roleLabel: 'Main Administrator',
          Icon: ShieldCheck
        };
    }
  }, [role]);

  const DeptIcon = departmentMeta.Icon;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      backgroundColor: 'var(--bg-page)',
      backgroundImage: 'radial-gradient(at 0% 0%, rgba(2, 132, 199, 0.03) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(217, 119, 6, 0.025) 0px, transparent 50%)',
      backgroundAttachment: 'fixed'
    }}>
      {/* Sleek Admin Back-Office Sidebar */}
      <aside style={{
        width: '252px',
        flexShrink: 0,
        background: 'linear-gradient(180deg, #0b192c 0%, #0d1e34 60%, #07111e 100%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 50
      }}>
        {/* Brand Header */}
        <div
          onClick={onGoHome || onSwitchRole}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '22px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          title="Return to Public Homepage View"
        >
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: departmentMeta.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: `0 4px 12px ${departmentMeta.color}40`
          }}>
            <Building2 size={20} color="#0b192c" />
          </div>
          <div>
            <div style={{ fontSize: '1.02rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>Property Flow</div>
            <div style={{ fontSize: '0.66rem', color: departmentMeta.color, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px' }}>
              {departmentMeta.subtitle}
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = adminTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAdminTab && setAdminTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  background: isActive ? departmentMeta.bgBadge : 'transparent',
                  color: isActive ? (departmentMeta.color === '#10b981' ? '#34d399' : departmentMeta.color === '#38bdf8' ? '#7dd3fc' : '#fbbf24') : '#94a3b8',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.86rem',
                  border: isActive ? `1px solid ${departmentMeta.color}33` : '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon size={17} color={isActive ? (departmentMeta.color === '#10b981' ? '#34d399' : departmentMeta.color === '#38bdf8' ? '#7dd3fc' : '#fbbf24') : '#64748b'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info & Switch/Logout Controls */}
        <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '4px 8px', fontSize: '0.74rem', color: '#64748b' }}>
            Logged in as<br />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <DeptIcon size={13} color={departmentMeta.color} />
              <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.82rem' }}>
                {currentUser?.fullName || departmentMeta.roleLabel}
              </span>
            </div>
            <div style={{
              display: 'inline-block',
              marginTop: '4px',
              padding: '2px 7px',
              borderRadius: '4px',
              fontSize: '0.68rem',
              fontWeight: 700,
              background: departmentMeta.bgBadge,
              color: departmentMeta.color
            }}>
              {departmentMeta.roleLabel}
            </div>
          </div>

          {role === 'ADMIN' && (
            <button
              onClick={onSwitchRole}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s'
              }}
            >
              <ArrowLeftRight size={14} color={departmentMeta.color} /> Switch to Customer View
            </button>
          )}

          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 12px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              color: '#f87171',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Sleek Top Bar for Back-Office */}
        <header style={{
          height: '60px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(226, 232, 240, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 40
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Console Area:
            </span>
            <span style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: '#0f172a',
              background: '#f1f5f9',
              padding: '4px 10px',
              borderRadius: '6px'
            }}>
              {navItems.find(n => n.id === adminTab)?.label || 'Overview'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: '#059669',
              background: '#ecfdf5',
              padding: '4px 10px',
              borderRadius: '9999px',
              border: '1px solid #a7f3d0'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              Server Online & Synchronized
            </span>

            {onGoHome && (
              <button
                type="button"
                onClick={onGoHome}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                title="View public website homepage"
              >
                Homepage View
              </button>
            )}
          </div>
        </header>

        <main style={{ flex: 1, padding: '24px 32px 48px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}

