import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Calendar, Trash2, X, Check, AlertTriangle, Save, LogOut } from 'lucide-react';
import { api } from '../api';

export default function UserProfileModal({ isOpen, onClose, currentUser, onProfileUpdated, onAccountDeleted, showToast }) {
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.fullName || '');
      setPhone(currentUser.phone || '');
      setConfirmDelete(false);
      setPhoneError('');
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/[^0-9+]/g, '');
    setPhone(val);
    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length > 0 && digitsOnly.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
    } else {
      setPhoneError('');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const digitsOnly = phone.replace(/\D/g, '');
    if (phone && digitsOnly.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updateProfile({ fullName, phone });
      if (showToast) showToast('Profile updated successfully!');
      if (onProfileUpdated) onProfileUpdated(updated);
      onClose();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.deleteProfile();
      if (showToast) showToast('Your account has been deleted successfully.');
      if (onAccountDeleted) onAccountDeleted();
      onClose();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to delete account', 'error');
      setDeleting(false);
    }
  };

  const initials = (currentUser.fullName || 'User')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isMainAdmin = currentUser.role === 'ADMIN' || currentUser.email?.toLowerCase() === 'admin@gmail.com';

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 2000 }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '520px',
          width: '100%',
          padding: 0,
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Luxury Brand Touch */}
        <div
          style={{
            background: 'var(--primary-gradient)',
            padding: '24px 28px',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '2px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
                fontWeight: 800,
                color: '#fbbf24'
              }}
            >
              {initials}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>User Profile</h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '2px 0 0' }}>Manage personal details and account settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px 28px', maxHeight: 'calc(85vh - 120px)', overflowY: 'auto' }}>
          {/* Account Status Badge Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              marginBottom: '20px'
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Account Classification
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>
                {currentUser.role?.toLowerCase()} User
              </div>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '20px',
                backgroundColor: '#ecfdf5',
                color: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
              Verified & Active
            </span>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Full Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Registered Email Address <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>(Read-Only)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={currentUser.email || ''}
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#f1f5f9',
                    fontSize: '0.9rem',
                    color: '#64748b',
                    cursor: 'not-allowed',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Contact Phone
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="0771234567"
                  maxLength={10}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '8px',
                    border: phoneError ? '1px solid #dc2626' : '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              {phoneError && (
                <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                  {phoneError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '24px' }}>
              <button
                type="submit"
                disabled={saving || !!phoneError}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  fontSize: '0.85rem'
                }}
              >
                <Save size={15} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Danger Zone: Delete Profile */}
          <div
            style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: '20px',
              marginTop: '10px'
            }}
          >
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '12px',
                padding: '18px 20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertTriangle size={18} color="#e11d48" />
                <h4 style={{ fontSize: '0.95rem', color: '#9f1239', margin: 0, fontWeight: 700 }}>
                  Danger Zone
                </h4>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#be123c', margin: '0 0 14px', lineHeight: 1.5 }}>
                {isMainAdmin
                  ? 'The Main System Administrator account cannot be deleted.'
                  : 'Permanently remove your profile, viewing appointments, customer inquiries, and saved preferences. This action is irreversible.'}
              </p>

              {!isMainAdmin && (
                <>
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e11d48',
                        color: '#e11d48',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#e11d48';
                        e.target.style.color = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.color = '#e11d48';
                      }}
                    >
                      <Trash2 size={14} /> Delete Profile
                    </button>
                  ) : (
                    <div
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #f43f5e',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        animation: 'fadeIn 0.15s ease'
                      }}
                    >
                      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#9f1239', margin: '0 0 10px' }}>
                        Are you sure? Confirm profile and data deletion:
                      </p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={handleDeleteAccount}
                          disabled={deleting}
                          style={{
                            backgroundColor: '#e11d48',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '7px 14px',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          disabled={deleting}
                          style={{
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '7px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
