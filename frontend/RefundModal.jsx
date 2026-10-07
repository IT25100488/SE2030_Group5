import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, AlertOctagon, X, Clock, HelpCircle, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function RefundModal({ isOpen, onClose, txn, isAdmin = false, onConfirmCancel, showToast }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [simulatedDays, setSimulatedDays] = useState(null);

  useEffect(() => {
    if (isOpen && txn) {
      setSimulatedDays(null);
      loadPreview(null);
    } else {
      setPreview(null);
      setSimulatedDays(null);
    }
  }, [isOpen, txn?.id]);

  const hasPaid = !!(txn?.paymentDate || txn?.status === 'PAYMENT_PENDING' || txn?.status === 'PAYMENT_RECEIVED' || txn?.status === 'CONFIRMED' || txn?.status === 'COMPLETED');

  const loadPreview = async (days) => {
    if (!txn) return;
    if (!hasPaid) {
      setPreview({
        policyName: 'NONE',
        daysElapsed: 0,
        originalAmount: 0,
        taxRate: 0.0,
        taxDeduction: 0,
        netRefundAmount: 0,
        eligible: false,
        isUnpaid: true,
        message: 'No deposit payment has been recorded for this reservation. Refunds are not applicable because zero payment was made.'
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.getRefundPreview(txn.id, days);
      setPreview(res);
    } catch (err) {
      console.error('Failed to load refund preview:', err);
      // Fallback local computation if network fails
      const baseDate = txn.paymentDate || txn.createdAt || new Date().toISOString();
      const actualDays = Math.max(0, Math.floor((Date.now() - new Date(baseDate).getTime()) / (1000 * 60 * 60 * 24)));
      const daysElapsed = (days !== null && days !== undefined) ? days : actualDays;
      const deposit = txn.depositAmount || 0;

      if (daysElapsed <= 2) {
        setPreview({
          policyName: 'FULL_REFUND',
          daysElapsed,
          originalAmount: deposit,
          taxRate: 0.0,
          taxDeduction: 0,
          netRefundAmount: deposit,
          eligible: true,
          message: `Full Refund (Day ${daysElapsed}, window 0–2 days): 100% of deposit refunded with zero tax deduction.`
        });
      } else if (daysElapsed <= 7) {
        const tax = Math.round(deposit * 0.15);
        setPreview({
          policyName: 'PARTIAL_REFUND',
          daysElapsed,
          originalAmount: deposit,
          taxRate: 0.15,
          taxDeduction: tax,
          netRefundAmount: deposit - tax,
          eligible: true,
          message: `Partial Refund (Day ${daysElapsed}, window 3–7 days): 15% tax deducted. Net refund: LKR ${(deposit - tax).toLocaleString()}.`
        });
      } else {
        setPreview({
          policyName: 'NO_REFUND',
          daysElapsed,
          originalAmount: deposit,
          taxRate: 0.0,
          taxDeduction: deposit,
          netRefundAmount: 0,
          eligible: false,
          message: `Non-Refundable (Day ${daysElapsed}): Past 1-week grace period. Strictly no returns or refunds permitted.`
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDays = (days) => {
    setSimulatedDays(days);
    loadPreview(days);
  };

  const handleConfirm = async () => {
    if (!txn) return;
    setSubmitting(true);
    try {
      if (onConfirmCancel) {
        await onConfirmCancel(txn.id, simulatedDays);
      } else {
        await api.cancelReservation(txn.id, simulatedDays);
        if (showToast) showToast('Reservation cancelled and refund processed.');
      }
      onClose();
    } catch (err) {
      if (showToast) showToast('Cancellation failed: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !txn) return null;

  const invoiceNo = txn.invoiceNumber || txn.invoiceNo || `INV-${txn.id}`;
  const isFull = preview?.policyName === 'FULL_REFUND';
  const isPartial = preview?.policyName === 'PARTIAL_REFUND';
  const isNoRefund = preview?.policyName === 'NO_REFUND';

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '560px', width: '100%', borderRadius: '14px', padding: '28px' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: isFull ? '#dcfce7' : isPartial ? '#fef3c7' : '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            {isFull ? <CheckCircle2 size={20} color="#15803d" /> : isPartial ? <AlertTriangle size={20} color="#b45309" /> : <AlertOctagon size={20} color="#b91c1c" />}
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
              Cancel Reservation & Process Refund
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.84rem', margin: '2px 0 0' }}>
              Invoice: <strong>{invoiceNo}</strong> • {txn.listing?.title}
            </p>
          </div>
        </div>

        {/* Conditional Content: Unpaid Reservation vs Paid Refund */}
        {!hasPaid || preview?.isUnpaid ? (
          <div>
            <div style={{
              padding: '16px 18px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertTriangle size={18} color="#b91c1c" />
                <h4 style={{ margin: 0, color: '#991b1b', fontSize: '0.96rem', fontWeight: 700 }}>
                  No Payment Recorded
                </h4>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.84rem', color: '#7f1d1d', lineHeight: 1.5 }}>
                No deposit payment has been received for this reservation yet (LKR 0 paid).
                Under our official policy, <strong>refund requests are only available after a payment is made</strong>.
              </p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#991b1b' }}>
                If you wish to cancel this reservation, you can withdraw it now. The apartment will be released immediately with no refund.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={submitting}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="btn-danger"
                disabled={submitting}
                style={{ padding: '8px 16px', fontWeight: 700 }}
              >
                {submitting ? 'Cancelling...' : 'Cancel Reservation (No Refund)'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Policy Age Status Banner */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: isFull ? '#f0fdf4' : isPartial ? '#fffbeb' : '#fef2f2',
              border: `1px solid ${isFull ? '#86efac' : isPartial ? '#fde68a' : '#fecaca'}`,
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: isFull ? '#15803d' : isPartial ? '#b45309' : '#b91c1c',
                  letterSpacing: '0.04em'
                }}>
                  {isFull ? '🟢 Eligible for 100% Full Refund' : isPartial ? '🟠 Partial Refund Applicable (15% Tax)' : '🔴 Non-Refundable (Past 1 Week)'}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                  Reservation Age: Day {preview?.daysElapsed !== undefined ? preview.daysElapsed : 0}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.45 }}>
                {preview?.message || 'Calculating refund eligibility under official policy...'}
              </p>
            </div>

        {/* Financial Calculation Breakdown */}
        <div style={{ background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '18px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.04em' }}>
            Refund Calculation Breakdown
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
            <span style={{ color: '#64748b' }}>Deposit Amount Paid:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>
              LKR {(preview?.originalAmount || txn.depositAmount || 0).toLocaleString()}
            </span>
          </div>

          {isPartial && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem', color: '#b45309' }}>
              <span>Tax / Administrative Cutoff (15%):</span>
              <span style={{ fontWeight: 700 }}>
                - LKR {(preview?.taxDeduction || 0).toLocaleString()}
              </span>
            </div>
          )}

          {isNoRefund && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem', color: '#b91c1c' }}>
              <span>Policy Forfeiture (Non-Refundable &gt; 7 Days):</span>
              <span style={{ fontWeight: 700 }}>
                - LKR {(preview?.originalAmount || txn.depositAmount || 0).toLocaleString()}
              </span>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '2px solid #e2e8f0',
            paddingTop: '10px',
            marginTop: '8px'
          }}>
            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>
              Net Refund Amount Payable:
            </span>
            <span style={{
              fontWeight: 900,
              fontSize: '1.25rem',
              color: isFull ? '#15803d' : isPartial ? '#b45309' : '#b91c1c'
            }}>
              LKR {(preview?.netRefundAmount || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Test Simulator Pills (Allows checking all 3 tiers) */}
        <div style={{ marginBottom: '18px', padding: '10px 14px', background: '#eff6ff', borderRadius: '8px', border: '1px dashed #bfdbfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Clock size={14} color="#2563eb" />
            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#1e40af' }}>
              Simulate Cancellation Window (Test Policy Tiers):
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleSelectDays(1)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: (simulatedDays === 1 || (simulatedDays === null && preview?.daysElapsed <= 2)) ? '2px solid #15803d' : '1px solid #cbd5e1',
                background: (simulatedDays === 1 || (simulatedDays === null && preview?.daysElapsed <= 2)) ? '#dcfce7' : '#ffffff',
                color: '#15803d',
                cursor: 'pointer'
              }}
            >
              Day 1 (Full 100%)
            </button>
            <button
              type="button"
              onClick={() => handleSelectDays(4)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: (simulatedDays === 4 || (simulatedDays === null && preview?.daysElapsed >= 3 && preview?.daysElapsed <= 7)) ? '2px solid #b45309' : '1px solid #cbd5e1',
                background: (simulatedDays === 4 || (simulatedDays === null && preview?.daysElapsed >= 3 && preview?.daysElapsed <= 7)) ? '#fef3c7' : '#ffffff',
                color: '#b45309',
                cursor: 'pointer'
              }}
            >
              Day 4 (Partial -15%)
            </button>
            <button
              type="button"
              onClick={() => handleSelectDays(9)}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: (simulatedDays === 9 || (simulatedDays === null && preview?.daysElapsed > 7)) ? '2px solid #b91c1c' : '1px solid #cbd5e1',
                background: (simulatedDays === 9 || (simulatedDays === null && preview?.daysElapsed > 7)) ? '#fee2e2' : '#ffffff',
                color: '#b91c1c',
                cursor: 'pointer'
              }}
            >
              Day 9 (&gt;1 Wk: No Return)
            </button>
          </div>
        </div>

        {/* Official Policy Reminder Card */}
        <div style={{ fontSize: '0.76rem', color: '#64748b', lineHeight: 1.45, marginBottom: '20px', padding: '0 4px' }}>
          <strong>Policy Terms:</strong> Full refund within Days 0–2. Partial refund within Days 3–7 with 15% cut off as tax. After 1 week (&gt; 7 days), there is no going back and no returns.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={submitting}
            style={{ padding: '8px 16px', fontSize: '0.84rem' }}
          >
            Keep Reservation
          </button>

          {isNoRefund && !isAdmin ? (
            <button
              type="button"
              disabled
              style={{
                padding: '8px 16px',
                fontSize: '0.84rem',
                borderRadius: '6px',
                background: '#e2e8f0',
                color: '#94a3b8',
                border: '1px solid #cbd5e1',
                cursor: 'not-allowed',
                fontWeight: 700
              }}
            >
              Cancellation Expired (&gt; 1 Wk)
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting || loading}
              className="btn-danger"
              style={{
                padding: '8px 18px',
                fontSize: '0.84rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {submitting ? 'Processing...' : isNoRefund ? 'Confirm Non-Refundable Cancellation' : `Confirm Cancellation (Refund LKR ${(preview?.netRefundAmount || 0).toLocaleString()})`}
            </button>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
