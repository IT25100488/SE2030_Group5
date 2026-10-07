import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, Check, X, ShieldCheck, User } from 'lucide-react';
import { api, setAuthToken, setStoredUser } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, showToast }) {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'BUYER'
  });
  const [touched, setTouched] = useState({ email: false, password: false, fullName: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Email format validation: standard RFC email pattern
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const isEmailValid = emailRegex.test(form.email);

  // Password rules
  const pwdLengthValid = form.password.length >= 8;
  const pwdUpperValid = /[A-Z]/.test(form.password);
  const pwdLowerValid = /[a-z]/.test(form.password);
  const pwdNumberValid = /[0-9]/.test(form.password);
  const pwdSpecialValid = /[!@#$%^&*(),.?":{}|<>]/.test(form.password);

  const isPasswordValid = pwdLengthValid && pwdUpperValid && pwdLowerValid && pwdNumberValid && pwdSpecialValid;

  // Password strength calculation
  const rulesMet = [pwdLengthValid, pwdUpperValid, pwdLowerValid, pwdNumberValid, pwdSpecialValid].filter(Boolean).length;
  let strengthLabel = 'Too Short';
  let strengthColor = '#ef4444';
  let strengthWidth = '20%';

  if (rulesMet === 5) {
    strengthLabel = 'Strong & Secure';
    strengthColor = '#10b981';
    strengthWidth = '100%';
  } else if (rulesMet >= 3) {
    strengthLabel = 'Moderate';
    strengthColor = '#f59e0b';
    strengthWidth = '60%';
  } else if (rulesMet >= 1) {
    strengthLabel = 'Weak';
    strengthColor = '#f87171';
    strengthWidth = '35%';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Pre-validation checks
    if (!isEmailValid) {
      setError('Please provide a valid email address with a proper domain (e.g. yourname@domain.com).');
      return;
    }

    if (isRegister && !isPasswordValid) {
      setError('Password must satisfy all minimum security requirements below.');
      return;
    }

    if (isRegister && form.phone && form.phone.replace(/\D/g, '').length !== 10) {
      setError('Contact phone number must be exactly 10 digits (e.g. 07xxxxxxxx).');
      return;
    }

    if (!isRegister && form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (isRegister) {
        res = await api.register(form);
      } else {
        res = await api.login(form.email.trim(), form.password);
      }

      setAuthToken(res.token);
      const user = {
        id: res.id,
        fullName: res.fullName,
        email: res.email,
        role: res.role
      };
      setStoredUser(user);
      onAuthSuccess(user);
      if (showToast) {
        if (user.role === 'ADMIN' && user.email.toLowerCase() === 'admin@gmail.com') {
          showToast(isRegister ? 'Admin account created! Admin Back-Office activated.' : `Welcome back, ${user.fullName}`);
        } else {
          showToast(isRegister ? 'Account created successfully!' : `Welcome back, ${user.fullName}`);
        }
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (registerMode) => {
    setIsRegister(registerMode);
    setError('');
    setTouched({ email: false, password: false, fullName: false });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '460px', width: '100%', padding: '32px' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Tab switch between Sign In and Register */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '22px' }}>
          <button
            type="button"
            onClick={() => handleModeSwitch(false)}
            style={{
              flex: 1,
              padding: '12px 10px',
              fontWeight: 700,
              fontSize: '0.96rem',
              color: !isRegister ? '#0f294a' : '#64748b',
              borderBottom: !isRegister ? '2px solid #0f294a' : 'none',
              background: 'transparent'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch(true)}
            style={{
              flex: 1,
              padding: '12px 10px',
              fontWeight: 700,
              fontSize: '0.96rem',
              color: isRegister ? '#0f294a' : '#64748b',
              borderBottom: isRegister ? '2px solid #0f294a' : 'none',
              background: 'transparent'
            }}
          >
            Create Account
          </button>
        </div>

        <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '18px' }}>
          {isRegister
            ? 'Create an account to book private tours, save favorite residences, and reserve properties.'
            : 'Access your saved properties, scheduled viewings, and reservation invoices.'}
        </p>

        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '0.84rem', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                onBlur={() => setTouched({ ...touched, fullName: true })}
                style={{ width: '100%' }}
                placeholder="e.g. Kasun Fernando"
              />
              {touched.fullName && form.fullName.trim().length < 2 && (
                <span style={{ fontSize: '0.74rem', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                  Please enter your full name.
                </span>
              )}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Email Address *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onBlur={() => setTouched({ ...touched, email: true })}
                style={{
                  width: '100%',
                  borderColor: touched.email && !isEmailValid ? '#ef4444' : touched.email && isEmailValid ? '#10b981' : undefined
                }}
                placeholder="name@domain.com"
              />
            </div>
            {touched.email && !isEmailValid && (
              <span style={{ fontSize: '0.74rem', color: '#ef4444', marginTop: '3px', display: 'block' }}>
                Must be a valid email format (e.g. user@example.com).
              </span>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
                Password *
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />} {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onBlur={() => setTouched({ ...touched, password: true })}
              style={{
                width: '100%',
                borderColor: isRegister && touched.password && !isPasswordValid ? '#ef4444' : isRegister && touched.password && isPasswordValid ? '#10b981' : undefined
              }}
              placeholder={isRegister ? 'Enter secure password' : '••••••••'}
            />

            {/* Registration Password Requirements Checklist */}
            {isRegister && (
              <div style={{ marginTop: '10px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {/* Strength meter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.75rem' }}>
                  <span style={{ color: '#64748b' }}>Password Strength:</span>
                  <span style={{ fontWeight: 700, color: strengthColor }}>{strengthLabel}</span>
                </div>
                <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                  <div style={{ width: strengthWidth, height: '100%', background: strengthColor, transition: 'all 0.3s ease' }}></div>
                </div>

                {/* Rules Checklist */}
                <p style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>Minimum Security Requirements:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pwdLengthValid ? '#15803d' : '#94a3b8' }}>
                    {pwdLengthValid ? <Check size={13} color="#15803d" /> : <X size={13} />} At least 8 characters
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pwdUpperValid ? '#15803d' : '#94a3b8' }}>
                    {pwdUpperValid ? <Check size={13} color="#15803d" /> : <X size={13} />} At least one uppercase letter (A-Z)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pwdLowerValid ? '#15803d' : '#94a3b8' }}>
                    {pwdLowerValid ? <Check size={13} color="#15803d" /> : <X size={13} />} At least one lowercase letter (a-z)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pwdNumberValid ? '#15803d' : '#94a3b8' }}>
                    {pwdNumberValid ? <Check size={13} color="#15803d" /> : <X size={13} />} At least one number (0-9)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pwdSpecialValid ? '#15803d' : '#94a3b8' }}>
                    {pwdSpecialValid ? <Check size={13} color="#15803d" /> : <X size={13} />} At least one special symbol (!@#$%^&*)
                  </div>
                </div>
              </div>
            )}
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Account Role *
              </label>
              <select
                value={form.role || 'BUYER'}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.86rem' }}
              >
                <option value="BUYER">Buyer</option>
                <option value="SELLER">Owner</option>
                <option value="AGENT">Real Estate Agent</option>
              </select>
            </div>
          )}

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                Contact Phone
              </label>
              <input
                type="tel"
                maxLength={10}
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm({ ...form, phone: val });
                }}
                style={{
                  width: '100%',
                  borderColor: form.phone && form.phone.length !== 10 ? '#f59e0b' : form.phone && form.phone.length === 10 ? '#10b981' : undefined
                }}
                placeholder="eg:0778392401"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', marginTop: '6px', padding: '12px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
