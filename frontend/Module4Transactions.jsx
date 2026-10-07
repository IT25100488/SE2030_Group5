import React, { useState, useEffect, useMemo } from 'react';
import {
  CreditCard,
  Landmark,
  Receipt,
  FileText,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Printer,
  Trash2,
  X,
  Building2,
  AlertTriangle,
  RotateCcw,
  Award,
  Star,
  Home,
  Key,
  ExternalLink,
  Check,
  Sparkles
} from 'lucide-react';
import { api } from '../api';
import { isSandboxActive } from '../sandboxService';
import RefundModal from './RefundModal';

export default function Module4Transactions({ currentUser, showToast, confirmAction }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Payment Checkout Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [activeTxn, setActiveTxn] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'BANK_WIRE',
    referenceNumber: 'RTGS-' + Math.floor(100000 + Math.random() * 900000)
  });

  const formatPaymentMethod = (method) => {
    if (!method) return 'Awaiting Deposit';
    switch (method) {
      case 'BANK_WIRE':
      case 'BANK_TRANSFER':
      case 'RTGS_TRANSFER':
      case 'RTGS':
        return 'Direct RTGS / Bank Wire Transfer';
      case 'BANKERS_DRAFT':
      case 'MANAGERS_CHEQUE':
        return "Banker's Draft / Manager's Cheque";
      case 'BANK_SLIP_UPLOAD':
      case 'SLIP_UPLOAD':
      case 'ESCROW_DEPOSIT':
        return 'Accredited Escrow Bank Deposit Slip';
      case 'CREDIT_DEBIT_CARD':
        return 'Credit / Debit Card';
      default:
        return method.replace(/_/g, ' ');
    }
  };

  const getReferencePlaceholder = (method) => {
    switch (method) {
      case 'BANK_WIRE':
        return 'e.g. RTGS-892410 or UTR-20261005';
      case 'BANKERS_DRAFT':
        return 'e.g. BD-771204 (Commercial Bank / HNB)';
      case 'BANK_SLIP_UPLOAD':
        return 'e.g. SLIP-40192 (Colombo Fort Branch)';
      default:
        return 'Reference Number';
    }
  };

  const getReferenceLabel = (method) => {
    switch (method) {
      case 'BANK_WIRE':
        return 'RTGS / Electronic Wire Reference (UTR)';
      case 'BANKERS_DRAFT':
        return "Banker's Draft / Manager's Cheque No. & Issuing Bank";
      case 'BANK_SLIP_UPLOAD':
        return 'Escrow Bank Deposit Slip No. & Branch';
      default:
        return 'Reference Transaction ID';
    }
  };

  // Receipt / Invoice Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Refund / Cancellation Modal (for PAID transactions eligible for refund)
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [cancelTargetTxn, setCancelTargetTxn] = useState(null);

  // Unpaid Reservation Cancellation Modal (No Refund Applicable)
  const [unpaidCancelModalOpen, setUnpaidCancelModalOpen] = useState(false);
  const [unpaidTargetTxn, setUnpaidTargetTxn] = useState(null);
  const [unpaidCancelling, setUnpaidCancelling] = useState(false);

  // Sub-tab Navigation: ALL, PURCHASE_HISTORY, ACTIVE_RESERVATIONS, CANCELLED
  const [txnFilterTab, setTxnFilterTab] = useState('ALL');

  // Resident Review Modal for Purchased Properties
  const [reviewModalListing, setReviewModalListing] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const isPrivileged = (currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF' || currentUser?.role === 'FINANCE_ADMIN') && !isSandboxActive();

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = isPrivileged
        ? await api.getAllTransactions()
        : await api.getMyTransactions();
      setTransactions(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
    const handleSandboxUpdate = () => loadTransactions();
    window.addEventListener('sandbox-data-updated', handleSandboxUpdate);
    return () => window.removeEventListener('sandbox-data-updated', handleSandboxUpdate);
  }, [currentUser?.role, currentUser?.email]);

  const visibleTransactions = isPrivileged
    ? transactions
    : currentUser?.role === 'SELLER'
      ? transactions.filter(t => t.listing?.seller?.id === currentUser?.id || t.listing?.seller?.email?.toLowerCase() === currentUser?.email?.toLowerCase())
      : currentUser?.role === 'AGENT'
        ? transactions.filter(t => t.listing?.agent?.id === currentUser?.id || t.listing?.agent?.email?.toLowerCase() === currentUser?.email?.toLowerCase())
        : transactions.filter(t => t.isSimulated || t.buyer?.email?.toLowerCase() === currentUser?.email?.toLowerCase());

  // Determine if a transaction represents a completed acquisition / fully sold apartment
  const isFullyPurchased = (t) => {
    if (t.status === 'COMPLETED') return true;
    if (t.status === 'CONFIRMED' && (
      t.pricingStrategy === 'FULL_CASH' ||
      t.pricingPlan === 'FULL_CASH' ||
      (t.pricingPlan && t.pricingPlan.toLowerCase().includes('full')) ||
      (t.offerAmount > 0 && t.depositAmount >= t.offerAmount) ||
      t.listing?.status === 'SOLD'
    )) return true;
    if (t.listing?.status === 'SOLD' && t.status !== 'CANCELLED' && t.status !== 'DECLINED') return true;
    return false;
  };

  const purchaseHistoryList = useMemo(() => {
    return visibleTransactions.filter(isFullyPurchased);
  }, [visibleTransactions]);

  const activeReservationsList = useMemo(() => {
    return visibleTransactions.filter(t => !isFullyPurchased(t) && !['CANCELLED', 'DECLINED'].includes(t.status));
  }, [visibleTransactions]);

  const cancelledList = useMemo(() => {
    return visibleTransactions.filter(t => ['CANCELLED', 'DECLINED'].includes(t.status));
  }, [visibleTransactions]);

  const displayedTransactions = useMemo(() => {
    if (txnFilterTab === 'PURCHASE_HISTORY') return purchaseHistoryList;
    if (txnFilterTab === 'ACTIVE_RESERVATIONS') return activeReservationsList;
    if (txnFilterTab === 'CANCELLED') return cancelledList;
    return visibleTransactions;
  }, [txnFilterTab, purchaseHistoryList, activeReservationsList, cancelledList, visibleTransactions]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewModalListing) return;
    setSubmittingReview(true);
    try {
      await api.addReview(reviewModalListing.id, {
        rating: Number(reviewRating),
        comment: reviewComment
      });
      if (showToast) showToast('Thank you! Your verified resident review has been published.');
      setReviewModalListing(null);
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      if (showToast) showToast('Failed to submit review: ' + (err.message || 'Error occurred'), 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenPayment = (txn) => {
    setActiveTxn(txn);
    setPaymentForm({
      amount: txn.depositAmount,
      paymentMethod: 'BANK_WIRE',
      referenceNumber: 'RTGS-' + Math.floor(100000 + Math.random() * 900000)
    });
    setPayModalOpen(true);
  };

  const handlePaymentMethodChange = (newMethod) => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    let newRef = 'RTGS-' + randomNum;
    if (newMethod === 'BANKERS_DRAFT') {
      newRef = 'BD-' + randomNum + ' (Commercial Bank)';
    } else if (newMethod === 'BANK_SLIP_UPLOAD') {
      newRef = 'SLIP-' + randomNum + ' (Colombo Fort Branch)';
    }
    setPaymentForm(prev => ({
      ...prev,
      paymentMethod: newMethod,
      referenceNumber: newRef
    }));
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    try {
      await api.processPayment(activeTxn.id, paymentForm);
      if (showToast) showToast('Payment submitted and pending approval');
      setPayModalOpen(false);
      loadTransactions();
    } catch (err) {
      if (showToast) showToast('Payment authorization failed: ' + err.message, 'error');
    }
  };

  const handleOpenCancelModal = (txn) => {
    setCancelTargetTxn(txn);
    setRefundModalOpen(true);
  };

  const handleOpenUnpaidCancelModal = (txn) => {
    setUnpaidTargetTxn(txn);
    setUnpaidCancelModalOpen(true);
  };

  const handleConfirmCancelUnpaid = async () => {
    if (!unpaidTargetTxn) return;
    setUnpaidCancelling(true);
    try {
      const res = await api.cancelReservation(unpaidTargetTxn.id);
      if (showToast) {
        showToast(res.message || 'Reservation cancelled. No payment was made, so no refund is applicable.');
      }
      setUnpaidCancelModalOpen(false);
      setUnpaidTargetTxn(null);
      loadTransactions();
    } catch (err) {
      if (showToast) showToast('Cancellation failed: ' + err.message, 'error');
    } finally {
      setUnpaidCancelling(false);
    }
  };

  const handleCancelReservation = async (id, invoiceNo) => {
    const txn = transactions.find(t => t.id === id);
    if (txn) {
      const hasPaid = !!(txn.paymentDate || txn.status === 'PAYMENT_PENDING' || txn.status === 'PAYMENT_RECEIVED' || txn.status === 'CONFIRMED' || txn.status === 'COMPLETED');
      if (hasPaid) {
        handleOpenCancelModal(txn);
      } else {
        handleOpenUnpaidCancelModal(txn);
      }
    } else {
      try {
        await api.cancelReservation(id);
        if (showToast) showToast(`Reservation ${invoiceNo} cancelled`);
        loadTransactions();
      } catch (err) {
        if (showToast) showToast('Cancellation failed: ' + err.message, 'error');
      }
    }
  };

  const handleViewReceipt = (txn) => {
    setReceiptData(txn);
    setReceiptModalOpen(true);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '36px 32px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2rem', color: '#0f172a', marginBottom: '6px', fontWeight: 700 }}>
          Reservations & Invoices
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
          Manage your apartment reservations, deposit payments, official tax invoices, and cancellation refunds.
        </p>
      </div>

      {/* Official Refund Policy Banner - Exclusively visible to Buyer role */}
      {(!currentUser || currentUser.role === 'BUYER') && (
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <ShieldCheck size={24} color="#2563eb" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.94rem', color: '#0f172a', fontWeight: 700 }}>
                Official Reservation Refund & Cancellation Policy
              </h4>
              <div style={{ fontSize: '0.80rem', color: '#64748b', marginTop: '3px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span>• <strong style={{ color: '#0f294a' }}>Deposit Requirement:</strong> Refund requests are exclusively available once deposit payment is made. Unpaid reservations can be cancelled anytime with zero refund.</span>
                <span>• <strong style={{ color: '#15803d' }}>Full Refund (Days 0–2):</strong> 100% of deposit refunded with zero tax deduction.</span>
                <span>• <strong style={{ color: '#b45309' }}>Partial Refund (Days 3–7):</strong> 15% cut off as tax; 85% returned to buyer.</span>
                <span>• <strong style={{ color: '#b91c1c' }}>After 1 Week (&gt; 7 Days):</strong> Strictly non-refundable (no returns / no going back).</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table Container */}
      {/* Transactions Table Container */}
      <div className="clean-card" style={{ padding: '24px 28px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 4px', fontWeight: 700 }}>
              <Receipt size={20} color="#d97706" /> {(currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT') ? 'Property Sales, Invoices & Settlement Ledger' : 'Purchase Orders & Ownership Ledger'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.86rem', margin: 0 }}>
              {(currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT')
                ? 'Review buyers who purchased or reserved your properties, transaction invoices, and finalized settlements.'
                : 'Review your purchase history, active unit reservations, official tax invoices, and deeds.'}
            </p>
          </div>
          <span style={{ fontSize: '0.82rem', color: '#64748b', background: '#f1f5f9', padding: '6px 12px', borderRadius: '6px', fontWeight: 600 }}>
            Total Records: <strong style={{ color: '#0f172a' }}>{visibleTransactions.length}</strong>
          </span>
        </div>

        {/* Navigation Tabs: All Records, 🏆 My Purchase History, Active Reservations, Cancelled */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '22px', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
          <button
            type="button"
            onClick={() => setTxnFilterTab('ALL')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: txnFilterTab === 'ALL' ? '#0f294a' : '#f1f5f9',
              color: txnFilterTab === 'ALL' ? '#ffffff' : '#475569',
              transition: 'all 0.15s'
            }}
          >
            All Records ({visibleTransactions.length})
          </button>

          <button
            type="button"
            onClick={() => setTxnFilterTab('PURCHASE_HISTORY')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: txnFilterTab === 'PURCHASE_HISTORY' ? '2px solid #15803d' : '1px solid #bbf7d0',
              background: txnFilterTab === 'PURCHASE_HISTORY' ? '#15803d' : '#f0fdf4',
              color: txnFilterTab === 'PURCHASE_HISTORY' ? '#ffffff' : '#15803d',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s'
            }}
          >
            <Award size={15} /> 🏆 {(currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT') ? 'Sold Apartments History' : 'My Purchase History'} ({purchaseHistoryList.length})
          </button>

          <button
            type="button"
            onClick={() => setTxnFilterTab('ACTIVE_RESERVATIONS')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: txnFilterTab === 'ACTIVE_RESERVATIONS' ? '#0f294a' : '#f1f5f9',
              color: txnFilterTab === 'ACTIVE_RESERVATIONS' ? '#ffffff' : '#475569',
              transition: 'all 0.15s'
            }}
          >
            Active Reservations ({activeReservationsList.length})
          </button>

          <button
            type="button"
            onClick={() => setTxnFilterTab('CANCELLED')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: txnFilterTab === 'CANCELLED' ? '#0f294a' : '#f1f5f9',
              color: txnFilterTab === 'CANCELLED' ? '#ffffff' : '#475569',
              transition: 'all 0.15s'
            }}
          >
            Cancelled & Refunded ({cancelledList.length})
          </button>
        </div>

        {/* BUYER PURCHASE HISTORY INFO STRIP (Single Unified History Ledger) */}
        {txnFilterTab === 'PURCHASE_HISTORY' && purchaseHistoryList.length > 0 && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            color: '#166534'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={20} color="#15803d" />
              <div>
                <strong style={{ fontSize: '0.90rem' }}>
                  {(currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT') ? 'Official Property Sales & Settlement History' : 'Official Property Acquisition & Ownership History'}
                </strong>
                <p style={{ margin: '1px 0 0', fontSize: '0.78rem', color: '#15803d' }}>
                  {(currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT')
                    ? 'Every residence below has been purchased by a buyer and completed full financial settlement. Ownership title deeds are legally conveyed.'
                    : 'Every residence below has completed full financial settlement. Ownership title deeds are legally conveyed and archived in this ledger.'}
                </p>
              </div>
            </div>
            <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '4px 12px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
              {purchaseHistoryList.length} Acquired {purchaseHistoryList.length === 1 ? 'Residence' : 'Residences'}
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading records...</div>
        ) : displayedTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
            <Receipt size={36} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ color: '#0f172a', marginBottom: '6px' }}>No Records in this Section</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              {txnFilterTab === 'PURCHASE_HISTORY'
                ? 'You do not have any fully settled / acquired properties yet.'
                : txnFilterTab === 'ACTIVE_RESERVATIONS'
                  ? 'You do not have any active unpaid or pending reservations.'
                  : txnFilterTab === 'CANCELLED'
                    ? 'No cancelled or refunded records.'
                    : 'Select a residence in "Explore Residences" to initiate a purchase reservation.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <table className="clean-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f294a' }}>
                  <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#ffffff', fontWeight: 700, letterSpacing: '0.05em', background: '#0f294a', borderBottom: '2px solid #d97706' }}>INVOICE NO</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#ffffff', fontWeight: 700, letterSpacing: '0.05em', background: '#0f294a', borderBottom: '2px solid #d97706' }}>PROPERTY</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#ffffff', fontWeight: 700, letterSpacing: '0.05em', background: '#0f294a', borderBottom: '2px solid #d97706' }}>BUYER</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#ffffff', fontWeight: 700, letterSpacing: '0.05em', background: '#0f294a', borderBottom: '2px solid #d97706' }}>PLAN & STRATEGY</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#ffffff', fontWeight: 700, letterSpacing: '0.05em', background: '#0f294a', borderBottom: '2px solid #d97706' }}>TOTAL PRICE</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#ffffff', fontWeight: 700, letterSpacing: '0.05em', background: '#0f294a', borderBottom: '2px solid #d97706' }}>DEPOSIT / PAID</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#ffffff', fontWeight: 700, letterSpacing: '0.05em', background: '#0f294a', borderBottom: '2px solid #d97706' }}>REMAINING DUE</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#ffffff', fontWeight: 700, letterSpacing: '0.05em', background: '#0f294a', borderBottom: '2px solid #d97706' }}>STATUS</th>
                  <th style={{ padding: '14px 16px', fontSize: '0.78rem', color: '#ffffff', fontWeight: 700, letterSpacing: '0.05em', background: '#0f294a', borderBottom: '2px solid #d97706', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {displayedTransactions.map((txn) => {
                  const isPurchased = isFullyPurchased(txn);
                  const isConfirmed = txn.status === 'CONFIRMED' || txn.status === 'COMPLETED';
                  const isPending = txn.status === 'PAYMENT_PENDING' || txn.status === 'PAYMENT_RECEIVED' || txn.status === 'DEPOSIT_PAID' || txn.status === 'PENDING';
                  const isOfferSubmitted = txn.status === 'OFFER_SUBMITTED' || txn.status === 'RESERVED';
                  const isCancelled = txn.status === 'CANCELLED' || txn.status === 'DECLINED';
                  const hasPaid = !!(txn.paymentDate || isPending || isConfirmed);
                  const isOwner = txn.buyer?.email?.toLowerCase() === currentUser?.email?.toLowerCase();
                  const canAct = isPrivileged || isOwner;
                  const canViewInvoice = isPrivileged || currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT' ? !isCancelled : (isConfirmed || isPurchased);
                  const isConfirmedOrSettled = isPurchased || txn.status === 'CONFIRMED' || txn.status === 'COMPLETED' || txn.status === 'PAYMENT_RECEIVED';
                  // Module 4.2: Prevent buyer unilateral cancellation after settlement / full payment
                  const canRequestRefund = hasPaid && !isCancelled && !isPurchased && (isPrivileged || (isOwner && !isConfirmedOrSettled));
                  const canCancelUnpaid = !hasPaid && !isCancelled && canAct && !isConfirmedOrSettled;

                  const isFullCash = txn.pricingPlan === 'FULL_CASH' || txn.pricingStrategy === 'FULL_CASH';
                  const remainingBalance = (isPurchased || isFullCash) ? 0 : Math.max(0, (txn.offerAmount || 0) - (txn.depositAmount || 0));

                  return (
                    <tr key={txn.id} style={{ borderBottom: '1px solid #f1f5f9', background: isPurchased ? '#fcfdfd' : 'transparent' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f294a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {isPurchased && <Award size={14} color="#15803d" />}
                          {txn.invoiceNumber || txn.invoiceNo || `INV-${txn.id}`}
                        </div>
                        {isPurchased && (txn.paymentDate || txn.updatedAt) && (
                          <div style={{ fontSize: '0.70rem', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                            Settled: {new Date(txn.paymentDate || txn.updatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{txn.listing?.title || 'Luxury Suite'}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{txn.listing?.city} {txn.listing?.district ? `• ${txn.listing?.district}` : ''}</div>
                        {isPurchased && txn.paymentReference && (
                          <div style={{ fontSize: '0.70rem', color: '#0284c7', fontFamily: 'monospace', marginTop: '2px' }}>
                            Ref: {txn.paymentReference}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{txn.buyer?.fullName || 'Registered Client'}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{txn.buyer?.email}</div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          fontSize: '0.78rem',
                          background: isFullCash ? '#dcfce7' : '#f1f5f9',
                          color: isFullCash ? '#15803d' : '#334155',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          border: isFullCash ? '1px solid #bbf7d0' : 'none'
                        }}>
                          {isFullCash ? 'FULL (2% OFF)' : (txn.pricingPlan || 'STANDARD')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#0f172a' }}>
                        <div>LKR {txn.offerAmount?.toLocaleString()}</div>
                        {isFullCash && (
                          <div style={{ fontSize: '0.70rem', color: '#15803d', fontWeight: 600 }}>2% Discount Included</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 700, color: (isPurchased || isConfirmed) ? '#15803d' : '#d97706' }}>
                        <div>LKR {(isPurchased && !isFullCash && txn.offerAmount ? txn.offerAmount : txn.depositAmount)?.toLocaleString()}</div>
                        {isPurchased && (
                          <div style={{ fontSize: '0.70rem', color: '#15803d', fontWeight: 700 }}>100% Settled</div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {isPurchased || isFullCash ? (
                          <div>
                            <span style={{ fontWeight: 700, color: '#15803d', fontSize: '0.88rem' }}>LKR 0</span>
                            <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>Fully Paid & Settled</div>
                          </div>
                        ) : isCancelled ? (
                          <div>
                            <span style={{ fontWeight: 600, color: '#94a3b8', fontSize: '0.88rem' }}>—</span>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Cancelled</div>
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.88rem' }}>
                              LKR {remainingBalance.toLocaleString()}
                            </span>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Balance to be paid</div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {isPurchased ? (
                          <div>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.74rem', fontWeight: 800 }}>
                              <CheckCircle2 size={12} /> 🏆 Acquired (Sold)
                            </span>
                            <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                              Title Deed Transferred
                            </div>
                          </div>
                        ) : isConfirmed ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.74rem', fontWeight: 700 }}>
                            <CheckCircle2 size={12} /> Confirmed
                          </span>
                        ) : isPending ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.74rem', fontWeight: 700 }}>
                            <Clock size={12} /> Pending Approval
                          </span>
                        ) : isCancelled ? (
                          <div>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.74rem', fontWeight: 700 }}>
                              Cancelled
                            </span>
                            {txn.refundType && txn.refundType !== 'NONE' ? (
                              <div style={{
                                fontSize: '0.70rem',
                                color: txn.refundType === 'FULL_REFUND' ? '#15803d' : txn.refundType === 'PARTIAL_REFUND' ? '#b45309' : '#b91c1c',
                                fontWeight: 700,
                                marginTop: '3px'
                              }}>
                                {txn.refundType === 'FULL_REFUND' ? 'Full Refund (0% Tax)' : txn.refundType === 'PARTIAL_REFUND' ? 'Partial (-15% Tax)' : 'Non-Refundable'}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.70rem', color: '#64748b', fontWeight: 600, marginTop: '3px' }}>
                                No Payment Made
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.74rem', fontWeight: 700 }}>
                            <Clock size={12} /> Awaiting Deposit
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {/* Unpaid Actions: Pay Deposit OR Cancel (No Refund) */}
                          {isOfferSubmitted && canAct && !hasPaid && (
                            <button
                              onClick={() => handleOpenPayment(txn)}
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, borderRadius: '6px' }}
                            >
                              <Landmark size={13} /> Pay Deposit
                            </button>
                          )}
                          {canCancelUnpaid && (
                            <button
                              onClick={() => handleOpenUnpaidCancelModal(txn)}
                              className="btn-secondary"
                              style={{ padding: '6px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: '#fca5a5', color: '#dc2626', fontWeight: 600, borderRadius: '6px', background: '#fff' }}
                              title="Cancel Reservation (No Payment Made)"
                            >
                              <Trash2 size={13} /> Cancel
                            </button>
                          )}

                          {/* Paid & Pending Verification Notice */}
                          {isPending && !isPrivileged && (
                            <span style={{ fontSize: '0.76rem', color: '#b45309', fontWeight: 600, background: '#fffbeb', padding: '4px 8px', borderRadius: '4px', border: '1px solid #fef3c7' }} title="Your payment was submitted and is pending admin approval">
                              <Clock size={11} style={{ marginRight: '3px', verticalAlign: '-1px' }} />Pending
                            </span>
                          )}

                          {/* Confirmed Invoice Button */}
                          {canViewInvoice && !isCancelled && (
                            <button
                              onClick={() => handleViewReceipt(txn)}
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: isPurchased ? '#15803d' : '#15803d', color: '#15803d', fontWeight: 600, borderRadius: '6px' }}
                              title="View Official Confirmed Tax Invoice / Title Deed"
                            >
                              <FileText size={13} color="#15803d" /> {isPurchased ? 'Title Deed' : 'Invoice'}
                            </button>
                          )}


                          {/* REFUND REQUEST: ONLY AVAILABLE IF BUYER HAS PAID (PRIOR TO SETTLEMENT) */}
                          {canRequestRefund && (
                            <button
                              onClick={() => handleOpenCancelModal(txn)}
                              className="btn-danger"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderRadius: '6px', fontWeight: 600 }}
                              title="Request Refund & Cancel Reservation"
                            >
                              <RotateCcw size={13} /> Request Refund
                            </button>
                          )}

                          {isPurchased ? (
                            <span
                              style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 700, background: '#f0fdf4', padding: '4px 8px', borderRadius: '4px', border: '1px solid #bbf7d0' }}
                              title="Property deed legally settled. You are the registered owner."
                            >
                              <ShieldCheck size={11} style={{ marginRight: '3px', verticalAlign: '-1px' }} />Verified Owner
                            </span>
                          ) : (isConfirmedOrSettled && isOwner && !isPrivileged && !isCancelled) ? (
                            <span
                              style={{ fontSize: '0.74rem', color: '#15803d', fontWeight: 600, background: '#f0fdf4', padding: '4px 8px', borderRadius: '4px', border: '1px solid #bbf7d0' }}
                              title="Contract is legally confirmed. Contact administration for formal conveyancing cancellation."
                            >
                              <ShieldCheck size={11} style={{ marginRight: '3px', verticalAlign: '-1px' }} />Settled
                            </span>
                          ) : null}

                          {/* Cancelled Receipt (only when refund occurred) */}
                          {isCancelled && hasPaid && txn.refundType && txn.refundType !== 'NONE' && (
                            <button
                              onClick={() => handleViewReceipt(txn)}
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: '#cbd5e1', color: '#475569', fontWeight: 600, borderRadius: '6px' }}
                              title="View Official Cancellation & Refund Credit Note"
                            >
                              <FileText size={13} color="#64748b" /> Refund Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PAYMENT MODAL */}
      {payModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', borderRadius: '12px' }}>
            <button
              onClick={() => setPayModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.30rem', color: '#0f172a', marginBottom: '6px', fontWeight: 700 }}>Authorize Deposit Payment</h2>
            <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '18px' }}>
              Invoice: <strong>{activeTxn?.invoiceNumber || activeTxn?.invoiceNo || `INV-${activeTxn?.id}`}</strong> • {activeTxn?.listing?.title}
            </p>

            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.86rem' }}>
                <span style={{ color: '#64748b' }}>Deposit Due:</span>
                <span style={{ fontWeight: 800, color: '#15803d', fontSize: '1.1rem' }}>
                  LKR {activeTxn?.depositAmount?.toLocaleString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem', color: '#64748b' }}>
                <span>Selected Plan:</span>
                <span style={{ fontWeight: 600, color: '#0f294a' }}>{activeTxn?.pricingPlan}</span>
              </div>
            </div>

            <form onSubmit={handleProcessPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  Payment Method
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => handlePaymentMethodChange(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                >
                  <option value="BANK_WIRE">Direct RTGS / Bank Wire Transfer (Central Bank)</option>
                  <option value="BANKERS_DRAFT">Banker's Draft / Manager's Cheque (Certified Pay Order)</option>
                  <option value="BANK_SLIP_UPLOAD">Accredited Escrow Bank Deposit Slip</option>
                </select>
                <div style={{ marginTop: '6px', fontSize: '0.74rem', color: '#64748b', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {paymentForm.paymentMethod === 'BANK_WIRE' && '⚡ Real-time gross electronic settlement via central bank interbank system (LankaSettle / RTGS).'}
                  {paymentForm.paymentMethod === 'BANKERS_DRAFT' && '🏛️ Certified bank-guaranteed funds issued directly in favor of the developer escrow account.'}
                  {paymentForm.paymentMethod === 'BANK_SLIP_UPLOAD' && '📄 Official physical branch counter teller deposit slip into accredited escrow trust account.'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  {getReferenceLabel(paymentForm.paymentMethod)}
                </label>
                <input
                  type="text"
                  required
                  placeholder={getReferencePlaceholder(paymentForm.paymentMethod)}
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setPayModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Landmark size={15} /> Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL TAX INVOICE MODAL */}
      {receiptModalOpen && receiptData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%', padding: '36px', borderRadius: '12px' }}>
            <button
              onClick={() => setReceiptModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* Print Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f294a', paddingBottom: '18px', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#0f294a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={15} color="#f59e0b" />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>PROPERTY FLOW</h3>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Marina Tower, Colombo 01, Sri Lanka</p>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>VAT Reg: LK-99281740-001</p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '1.2rem', color: receiptData.status === 'CANCELLED' ? '#b91c1c' : '#0f294a', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {receiptData.status === 'CANCELLED' ? 'Credit Note / Refund Receipt' : 'Tax Invoice'}
                </h2>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{receiptData.invoiceNumber || receiptData.invoiceNo || `INV-${receiptData.id}`}</p>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                  Date: {receiptData.reservationDate ? new Date(receiptData.reservationDate).toLocaleDateString() : '2026-09-16'}
                </p>
              </div>
            </div>

            {/* Client & Residence Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px', fontSize: '0.85rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>Billed To</p>
                <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{receiptData.buyer?.fullName || 'Purchaser'}</p>
                <p style={{ color: '#64748b', margin: '0 0 2px' }}>{receiptData.buyer?.email}</p>
                <p style={{ color: '#64748b', margin: 0 }}>Client ID: #CL-{receiptData.buyer?.id || '04'}</p>
              </div>

              <div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>Property Details</p>
                <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{receiptData.listing?.title}</p>
                <p style={{ color: '#64748b', margin: '0 0 2px' }}>{receiptData.listing?.city} • {receiptData.listing?.district}</p>
                <p style={{ color: '#64748b', margin: 0 }}>Plan: {receiptData.pricingPlan}</p>
                {receiptData.paymentMethod && (
                  <p style={{ color: '#64748b', margin: '3px 0 0', fontSize: '0.78rem' }}>
                    Payment Channel: <strong style={{ color: '#0f294a' }}>{formatPaymentMethod(receiptData.paymentMethod)}</strong>
                  </p>
                )}
                {receiptData.paymentReference && (
                  <p style={{ color: '#0284c7', margin: '1px 0 0', fontSize: '0.74rem', fontFamily: 'monospace' }}>
                    Ref: {receiptData.paymentReference}
                  </p>
                )}
              </div>
            </div>

            {/* Line Items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Item Description</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Amount (LKR)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 10px' }}>
                    <strong>Residential Unit Purchase Commitment</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Settlement Plan: {receiptData.pricingPlan}</div>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600 }}>
                    {receiptData.offerAmount?.toLocaleString()}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 10px' }}>
                    <strong>Immediate Reservation Deposit Requirement</strong>
                    <div style={{ fontSize: '0.78rem', color: receiptData.status === 'CANCELLED' ? '#b91c1c' : '#15803d' }}>
                      Status: {receiptData.status}
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#0f294a' }}>
                    {receiptData.depositAmount?.toLocaleString()}
                  </td>
                </tr>

                {/* Refund Policy Credit Note Rows when Cancelled */}
                {receiptData.status === 'CANCELLED' && (
                  <>
                    {receiptData.refundType && receiptData.refundType !== 'NONE' ? (
                      <>
                        {receiptData.refundTaxDeduction > 0 && (
                          <tr style={{ borderBottom: '1px solid #fecaca', background: '#fef2f2' }}>
                            <td style={{ padding: '10px', color: '#b45309' }}>
                              <strong>Cancellation Tax / Administrative Cutoff (15%)</strong>
                              <div style={{ fontSize: '0.74rem' }}>Applied per Partial Refund Policy (Days 3–7)</div>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>
                              - {receiptData.refundTaxDeduction?.toLocaleString()}
                            </td>
                          </tr>
                        )}
                        <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #86efac' }}>
                          <td style={{ padding: '12px 10px', color: '#15803d' }}>
                            <strong>Net Refund Payable to Buyer</strong>
                            <div style={{ fontSize: '0.74rem' }}>
                              Policy: {receiptData.refundType === 'FULL_REFUND' ? 'Full Refund (Days 0–2, 100%)' : receiptData.refundType === 'PARTIAL_REFUND' ? 'Partial Refund (Days 3–7, -15% Tax)' : 'Strict Non-Refundable (> 1 Week)'}
                            </div>
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 900, fontSize: '1.05rem', color: '#15803d' }}>
                            LKR {(receiptData.refundAmount !== undefined && receiptData.refundAmount !== null ? receiptData.refundAmount : receiptData.depositAmount)?.toLocaleString()}
                          </td>
                        </tr>
                      </>
                    ) : (
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px 10px', color: '#64748b' }}>
                          <strong>Cancellation Notice (Pre-Payment)</strong>
                          <div style={{ fontSize: '0.74rem' }}>Reservation was cancelled before deposit payment. No payment was collected.</div>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem', color: '#64748b' }}>
                          LKR 0 (No Refund Applicable)
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>

            {/* Stamp & Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={26} color={receiptData.status === 'CANCELLED' ? '#b91c1c' : '#15803d'} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                    {receiptData.status === 'CANCELLED' ? 'Official Cancellation & Refund Statement' : 'Verified Authentic Conveyance'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                    {receiptData.status === 'CANCELLED' ? 'Unit released back to public availability under statutory terms' : 'Digitally signed & authorized under Sri Lankan Real Estate Standards'}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge badge-${receiptData.status === 'CANCELLED' ? 'declined' : (receiptData.status === 'PAYMENT_RECEIVED' || receiptData.status === 'DEPOSIT_PAID' || receiptData.status === 'SETTLED' || receiptData.status === 'COMPLETED' ? 'available' : 'reserved')}`}>
                  {receiptData.status === 'CANCELLED' ? 'Cancelled / Released' : (receiptData.status === 'PAYMENT_RECEIVED' || receiptData.status === 'DEPOSIT_PAID' || receiptData.status === 'SETTLED' || receiptData.status === 'COMPLETED' ? 'Payment Received & Confirmed' : receiptData.status)}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setReceiptModalOpen(false)} className="btn-secondary">
                Close
              </button>
              <button type="button" onClick={() => window.print()} className="btn-primary">
                <Printer size={16} /> {receiptData.status === 'CANCELLED' ? 'Print Credit Note' : 'Print Tax Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNPAID RESERVATION CANCELLATION MODAL */}
      {unpaidCancelModalOpen && unpaidTargetTxn && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '100%', borderRadius: '14px', padding: '28px' }}>
            <button
              onClick={() => {
                setUnpaidCancelModalOpen(false);
                setUnpaidTargetTxn(null);
              }}
              style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={22} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Cancel Reservation</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
                  Invoice: <strong>{unpaidTargetTxn.invoiceNumber || unpaidTargetTxn.invoiceNo || `INV-${unpaidTargetTxn.id}`}</strong>
                </p>
              </div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <AlertTriangle size={16} color="#b45309" />
                <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#92400e' }}>No Payment Made — No Refund Needed</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#78350f', lineHeight: 1.45 }}>
                You have not made any payment for <strong>{unpaidTargetTxn.listing?.title || 'this residence'}</strong>. Cancelling will withdraw this reservation and release the apartment back to available inventory.
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: '#b45309', fontWeight: 600 }}>
                Since $0 was paid, no refund will be calculated or issued.
              </p>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '12px 14px', marginBottom: '20px', fontSize: '0.84rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: '#64748b' }}>
                <span>Deposit Status:</span>
                <span style={{ fontWeight: 600, color: '#dc2626' }}>Unpaid (LKR 0 Paid)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                <span>Refund Payable:</span>
                <span style={{ fontWeight: 700, color: '#0f294a' }}>LKR 0</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setUnpaidCancelModalOpen(false);
                  setUnpaidTargetTxn(null);
                }}
                className="btn-secondary"
                disabled={unpaidCancelling}
              >
                Keep Reservation
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelUnpaid}
                className="btn-danger"
                disabled={unpaidCancelling}
                style={{ padding: '8px 18px', fontWeight: 700 }}
              >
                {unpaidCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION & REFUND POLICY MODAL */}
      <RefundModal
        isOpen={refundModalOpen}
        onClose={() => {
          setRefundModalOpen(false);
          setCancelTargetTxn(null);
        }}
        txn={cancelTargetTxn}
        isAdmin={isPrivileged}
        onConfirmCancel={async (txnId, testDays) => {
          const res = await api.cancelReservation(txnId, testDays);
          if (showToast) {
            showToast(`Reservation cancelled. ${res.refundNotes || res.message || 'Refund processed.'}`);
          }
          loadTransactions();
        }}
        showToast={showToast}
      />

      {/* RESIDENT REVIEW MODAL FOR ACQUIRED PROPERTIES */}
      {reviewModalListing && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', borderRadius: '14px', padding: '28px' }}>
            <button
              onClick={() => {
                setReviewModalListing(null);
                setReviewComment('');
              }}
              style={{ position: 'absolute', top: '18px', right: '18px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={22} color="#d97706" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a', fontWeight: 700 }}>Verified Resident Review</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
                  Share your living experience as the registered owner of this property.
                </p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '18px' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem' }}>{reviewModalListing.title}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{reviewModalListing.city}, {reviewModalListing.district}</div>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Your Rating
                </label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      <Star
                        size={28}
                        color={star <= reviewRating ? '#f59e0b' : '#cbd5e1'}
                        fill={star <= reviewRating ? '#f59e0b' : 'transparent'}
                      />
                    </button>
                  ))}
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#b45309', marginLeft: '10px' }}>
                    {reviewRating} out of 5 Stars
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Resident Feedback & Living Experience
                </label>
                <textarea
                  rows={4}
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details about the architectural quality, amenities, security, neighborhood, and overall satisfaction..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.86rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setReviewModalListing(null);
                    setReviewComment('');
                  }}
                  className="btn-secondary"
                  disabled={submittingReview}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submittingReview}
                  style={{ background: '#d97706', borderColor: '#d97706', padding: '8px 18px', fontWeight: 700 }}
                >
                  {submittingReview ? 'Publishing...' : 'Publish Resident Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
