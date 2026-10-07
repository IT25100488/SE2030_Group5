import React, { useState } from 'react';
import { Calendar, Clock, DollarSign, X, CheckCircle2, Sparkles, Tag, ShieldCheck, UserCheck, Video, MapPin, Calculator, Info, Landmark, Wallet, Globe, Phone } from 'lucide-react';
import { api, getStoredUser } from '../api';

export function ScheduleViewingModal({ listing, isOpen, onClose, onSuccess, showToast, currentUser }) {
  const user = currentUser || getStoredUser();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];

  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState('10:00 AM - 11:00 AM');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [inspectionAreas, setInspectionAreas] = useState({
    rooftop: true,
    parking: true,
    interior: true,
    blueprints: false
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !listing) return null;

  if (user?.role && user.role !== 'BUYER') {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '480px', width: '100%', padding: '28px', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <X size={24} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '8px', fontWeight: 800 }}>
            Buyer Access Only
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '20px' }}>
            Viewing tour scheduling is available exclusively for registered Buyers. Sellers and other accounts are not permitted to schedule viewing tours.
          </p>
          <button onClick={onClose} className="btn-primary" style={{ width: '100%' }}>
            Understood
          </button>
        </div>
      </div>
    );
  }

  const timeSlots = [
    { time: '09:00 AM - 10:00 AM', label: 'Morning Calm' },
    { time: '11:30 AM - 12:30 PM', label: 'Mid-Day Sunlight' },
    { time: '02:00 PM - 03:00 PM', label: 'Afternoon Tour' },
    { time: '04:30 PM - 05:30 PM', label: 'Golden Hour Sunset' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Module 3.2: 10-digit phone number validation
    const digitsOnly = (contactPhone || '').replace(/\D/g, '');
    if (digitsOnly.length !== 10) {
      if (showToast) showToast('A valid 10-digit telephone number (e.g. 0771234567) is required to book a viewing.', 'error');
      return;
    }

    setLoading(true);

    const areasList = Object.entries(inspectionAreas)
      .filter(([_, checked]) => checked)
      .map(([key]) => key.toUpperCase())
      .join(', ');

    const combinedNotes = `[Areas of Focus: ${areasList || 'General'}] ${notes ? '• Note: ' + notes : ''}`;

    try {
      await api.createAppointment({
        listingId: listing.id,
        appointmentDate: date,
        appointmentTime: time,
        contactPhone: contactPhone.trim(),
        notes: combinedNotes,
        agentId: null
      });
      if (showToast) showToast('Private viewing tour booked successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      if (showToast) showToast('Failed to schedule appointment: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '30px' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Calendar size={22} color="#d97706" />
          <h2 style={{ fontSize: '1.35rem', color: '#0f172a', margin: 0 }}>Schedule Private Residence Tour</h2>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '18px' }}>
          Coordinate an exclusive on-site walkthrough for <strong>{listing.title}</strong>
        </p>

        {/* Property Brief Card */}
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: 700, textTransform: 'uppercase' }}>{listing.propertyType}</span>
            <h4 style={{ fontSize: '0.98rem', color: '#0f172a', margin: '2px 0' }}>{listing.title}</h4>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>{listing.city} • {listing.district}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Price</span>
            <p style={{ fontSize: '1rem', fontWeight: 800, color: '#0f294a', margin: 0 }}>LKR {listing.price?.toLocaleString()}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Date Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Select Inspection Date *
            </label>
            <input
              type="date"
              required
              min={tomorrow}
              max={maxDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {/* Interactive Time Slot Pills */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
              Select Viewing Time Slot *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {timeSlots.map((slot) => {
                const isSelected = time === slot.time;
                return (
                  <div
                    key={slot.time}
                    onClick={() => setTime(slot.time)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #0f294a' : '1px solid #e2e8f0',
                      background: isSelected ? '#f1f5f9' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.84rem', color: '#0f294a' }}>{slot.time}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#64748b' }}>{slot.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Telephone Number (Ghost Prevention - Module 3.2) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Contact Telephone Number (10 Digits) *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="tel"
                required
                placeholder="e.g. 0771234567"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                maxLength={10}
                style={{ width: '100%', paddingLeft: '34px' }}
              />
              <Phone size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            </div>
            <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '4px 0 0' }}>
              Required to confirm tour availability and prevent ghost bookings.
            </p>
          </div>

          {/* Inspection Areas Checklist */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Areas of Special Focus
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.82rem', color: '#334155' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={inspectionAreas.rooftop}
                  onChange={(e) => setInspectionAreas({ ...inspectionAreas, rooftop: e.target.checked })}
                />
                Rooftop & Infinity Pool
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={inspectionAreas.parking}
                  onChange={(e) => setInspectionAreas({ ...inspectionAreas, parking: e.target.checked })}
                />
                Dedicated Parking Bays
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={inspectionAreas.interior}
                  onChange={(e) => setInspectionAreas({ ...inspectionAreas, interior: e.target.checked })}
                />
                Fitted Pantry & Bathrooms
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={inspectionAreas.blueprints}
                  onChange={(e) => setInspectionAreas({ ...inspectionAreas, blueprints: e.target.checked })}
                />
                Architectural Blueprints
              </label>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Additional Inquiries / Access Requirements
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Accompanied by family architect, requires wheelchair access..."
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Confirming...' : 'Book Private Tour'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PurchaseReservationModal({ listing, isOpen, onClose, onSuccess, showToast, currentUser }) {
  const [pricingPlan, setPricingPlan] = useState('STANDARD');
  const [notes, setNotes] = useState('');
  const [loanYears, setLoanYears] = useState(15);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !listing) return null;

  if (currentUser?.role && currentUser.role !== 'BUYER') {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '480px', width: '100%', padding: '28px', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <X size={24} />
          </div>
          <h3 style={{ fontSize: '1.25rem', color: '#0f172a', marginBottom: '8px', fontWeight: 800 }}>
            Buyer Access Only
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '20px' }}>
            Apartment reservations and purchases are available exclusively for registered Buyers. Sellers and other accounts are not permitted to reserve apartments.
          </p>
          <button onClick={onClose} className="btn-primary" style={{ width: '100%' }}>
            Understood
          </button>
        </div>
      </div>
    );
  }

  // Fixed Property List Price (No arbitrary offer negotiations)
  const basePrice = listing.price || 50000000;
  let discountRate = 0;
  let discountAmount = 0;
  let depositRate = 0.10;
  let planTitle = 'Standard Settlement';

  if (pricingPlan === 'FULL_CASH') {
    discountRate = 0.02; // 2% immediate discount
    depositRate = 1.0;  // 100% full settlement
    planTitle = 'Full Settlement';
  }

  discountAmount = basePrice * discountRate;
  const netPropertyPrice = basePrice - discountAmount;
  const stampDuty = netPropertyPrice * 0.04; // 4% Government Stamp Duty
  const legalFee = netPropertyPrice * 0.01; // 1% Legal & Conveyancing
  const totalAcquisition = netPropertyPrice + stampDuty + legalFee;
  const depositPayable = pricingPlan === 'FULL_CASH' ? netPropertyPrice : Math.round(netPropertyPrice * 0.10);
  const remainingDue = pricingPlan === 'FULL_CASH' ? 0 : (netPropertyPrice - depositPayable);

  // Monthly Loan EMI Simulation (12% p.a. interest)
  const financedAmount = netPropertyPrice - depositPayable;
  const monthlyRate = 0.12 / 12;
  const totalMonths = loanYears * 12;
  const monthlyEMI = financedAmount > 0
    ? Math.round((financedAmount * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1))
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.createReservation({
        listingId: listing.id,
        listingTitle: listing.title,
        city: listing.city,
        district: listing.district,
        basePrice: basePrice,
        offerAmount: netPropertyPrice,
        pricingPlan: pricingPlan,
        notes: notes?.trim() || 'Direct Reservation'
      });
      if (showToast) showToast('Apartment reserved! Proceed to Purchases & Invoices to pay deposit.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      if (showToast) showToast('Reservation failed (please sign in): ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <ShieldCheck size={22} color="#0f294a" />
          <h2 style={{ fontSize: '1.35rem', color: '#0f172a', margin: 0 }}>Reserve Luxury Residence</h2>
        </div>
        <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '18px' }}>
          Lock inventory and purchase <strong>{listing.title}</strong>
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Apartment Fixed Price Card (Replaces editable offer price input) */}
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Apartment Fixed Price:</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>LKR {basePrice.toLocaleString()}</span>
          </div>

          {/* Settlement Option Strategy Cards */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
              Select Pricing & Settlement Strategy
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div
                onClick={() => setPricingPlan('STANDARD')}
                style={{
                  padding: '14px 12px',
                  borderRadius: '10px',
                  border: pricingPlan === 'STANDARD' ? '2px solid #0f294a' : '1px solid #e2e8f0',
                  background: pricingPlan === 'STANDARD' ? '#f1f5f9' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', margin: '0 0 2px' }}>Standard Settlement</p>
                <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '0 0 4px' }}>10% Initial Down Payment</p>
                <span style={{ fontSize: '0.72rem', color: '#0f294a', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Balance in Milestones</span>
              </div>

              <div
                onClick={() => setPricingPlan('FULL_CASH')}
                style={{
                  padding: '14px 12px',
                  borderRadius: '10px',
                  border: pricingPlan === 'FULL_CASH' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: pricingPlan === 'FULL_CASH' ? '#f0fdf4' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#16a34a', margin: '0 0 2px' }}>Full Settlement</p>
                <p style={{ fontSize: '0.76rem', color: '#15803d', margin: '0 0 4px' }}>2% Instant Settlement Discount</p>
                <span style={{ fontSize: '0.72rem', color: '#16a34a', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>Save 2% Cash Discount</span>
              </div>
            </div>
          </div>

          {/* Interactive Itemized Conveyancing Breakdown Table */}
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>List Price:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>LKR {basePrice.toLocaleString()}</span>
            </div>

            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#15803d' }}>
                <span>{planTitle} (2% Discount):</span>
                <span style={{ fontWeight: 700 }}>- LKR {discountAmount.toLocaleString()}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: '#64748b' }}>Net Property Price:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>LKR {netPropertyPrice.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem', color: '#64748b' }}>
              <span>Stamp Duty (4% Inland Revenue):</span>
              <span>+ LKR {stampDuty.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem', color: '#64748b' }}>
              <span>Legal Deed & Conveyancing (1%):</span>
              <span>+ LKR {legalFee.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginBottom: '8px' }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Total Acquisition Commitment:</span>
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.98rem' }}>LKR {totalAcquisition.toLocaleString()}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #0f294a', paddingTop: '8px', marginBottom: '6px' }}>
              <span style={{ fontWeight: 800, color: '#15803d', fontSize: '0.95rem' }}>
                {pricingPlan === 'FULL_CASH' ? 'Total Payable Today (2% Discounted):' : 'Initial Deposit Payable Today (10%):'}
              </span>
              <span style={{ fontWeight: 900, color: '#15803d', fontSize: '1.2rem' }}>
                LKR {depositPayable.toLocaleString()}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px', fontSize: '0.84rem', color: pricingPlan === 'FULL_CASH' ? '#15803d' : '#b45309', fontWeight: 700 }}>
              <span>Remaining Price to be Paid:</span>
              <span>{pricingPlan === 'FULL_CASH' ? 'LKR 0 (Fully Settled)' : `LKR ${remainingDue.toLocaleString()}`}</span>
            </div>
          </div>

          {/* Official Refund Policy Disclosure Card */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start'
          }}>
            <ShieldCheck size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                Official Reservation Refund Policy:
              </div>
              <div>
                • <strong style={{ color: '#15803d' }}>Full Refund (Days 0–2):</strong> 100% of deposit refunded with zero tax deduction.
              </div>
              <div>
                • <strong style={{ color: '#b45309' }}>Partial Refund (Days 3–7):</strong> 15% cut off total amount as tax; 85% net refund.
              </div>
              <div>
                • <strong style={{ color: '#b91c1c' }}>After 1 Week (&gt; 7 Days):</strong> Strictly non-refundable. No returns or cancellations permitted.
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
              Additional Notes or Requests (Optional)
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Registering jointly with spouse, attorney contact info, or preferred bank branch..."
              style={{ width: '100%', fontSize: '0.84rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Reserving...' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
