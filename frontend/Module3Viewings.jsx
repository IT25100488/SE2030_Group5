import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, RefreshCw, Trash2, X, AlertCircle, UserCheck, User, ShieldCheck, Lock, Sparkles, Bell, Star, MessageSquare } from 'lucide-react';
import { api } from '../api';
import { isSandboxActive } from '../sandboxService';

export default function Module3Viewings({ currentUser, showToast, confirmAction }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [agentTourFilter, setAgentTourFilter] = useState('ALL'); // 'ALL' | 'OPEN' | 'MY_ACTIVE' | 'COMPLETED'
  const [buyerTourFilter, setBuyerTourFilter] = useState('ALL'); // 'ALL' | 'UPCOMING' | 'COMPLETED'

  // Reschedule Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({
    appointmentDate: '',
    appointmentTime: '10:00 AM - 11:00 AM',
    notes: '',
    status: 'REQUESTED'
  });

  // Tour Review Modal State (For Completed Viewing Tours)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAppt, setReviewAppt] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [existingUserReview, setExistingUserReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const handleOpenReviewModal = async (appt) => {
    setReviewAppt(appt);
    setReviewRating(5);
    setReviewComment('');
    setExistingUserReview(null);
    setReviewModalOpen(true);
    setReviewLoading(true);
    try {
      if (appt.listing?.id) {
        const listingReviews = await api.getListingReviews(appt.listing.id);
        const myReview = (listingReviews || []).find(r =>
          (currentUser?.email && r.user?.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
          (currentUser?.id && r.user?.id === currentUser.id)
        );
        if (myReview) {
          setReviewRating(myReview.rating);
          setReviewComment(myReview.comment);
          setExistingUserReview(myReview);
        }
      }
    } catch (err) {
      console.error('Failed to load existing review for listing:', err);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSaveTourReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;
    setReviewSubmitting(true);
    try {
      if (existingUserReview) {
        await api.updateReview(existingUserReview.id, {
          rating: reviewRating,
          comment: reviewComment,
          listingId: reviewAppt.listing.id
        });
        if (showToast) showToast('Your tour review was updated successfully!', 'success');
      } else {
        await api.addReview(reviewAppt.listing.id, {
          rating: reviewRating,
          comment: reviewComment
        });
        if (showToast) showToast('Verified tour review posted successfully! Thank you for sharing your experience.', 'success');
      }
      setReviewModalOpen(false);
      setReviewAppt(null);
      loadData();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const isStaff = (currentUser?.role === 'AGENT' || currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF' || currentUser?.role === 'FINANCE_ADMIN') && !isSandboxActive();
      const appts = await (isStaff ? api.getAllAppointments() : api.getMyAppointments()).catch(() => []);

      if (isStaff) {
        setAppointments(appts || []);
      } else {
        // Customer view: strictly restrict to the unique booked buyer or simulated items
        const myEmail = currentUser?.email?.toLowerCase();
        const myId = currentUser?.id;
        const myAppts = (appts || []).filter(a => {
          if (a.isSimulated) return true;
          if (!currentUser) return false;
          const buyerEmail = a.buyer?.email?.toLowerCase();
          const buyerId = a.buyer?.id;
          return (myEmail && buyerEmail === myEmail) || (myId && buyerId === myId);
        });
        setAppointments(myAppts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleSandboxUpdate = () => loadData();
    window.addEventListener('sandbox-data-updated', handleSandboxUpdate);
    return () => window.removeEventListener('sandbox-data-updated', handleSandboxUpdate);
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  const handleOpenReschedule = (appt) => {
    if (appt.status === 'COMPLETED') {
      if (showToast) showToast('Completed viewing tours cannot be rescheduled.', 'error');
      return;
    }
    setEditingAppt(appt);
    setRescheduleData({
      appointmentDate: appt.appointmentDate || '',
      appointmentTime: appt.appointmentTime || '10:00 AM - 11:00 AM',
      notes: appt.notes || '',
      status: (currentUser?.role === 'AGENT' || currentUser?.role === 'ADMIN' || currentUser?.role === 'FINANCE_ADMIN') ? (appt.status || 'CONFIRMED') : 'REQUESTED'
    });
    setEditModalOpen(true);
  };

  const handleSaveReschedule = async (e) => {
    e.preventDefault();
    try {
      await api.updateAppointment(editingAppt.id, rescheduleData);
      if (showToast) showToast('Viewing tour rescheduled successfully!');
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      if (showToast) showToast('Update failed: ' + err.message, 'error');
    }
  };

  const handleQuickStatus = async (id, status) => {
    try {
      await api.updateAppointment(id, { status });
      if (showToast) showToast(`Appointment marked as ${status}`);
      loadData();
    } catch (err) {
      if (showToast) showToast('Status update failed: ' + err.message, 'error');
    }
  };

  const isAgent = currentUser?.role === 'AGENT';
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'FINANCE_ADMIN';

  const isMyTour = (appt) => {
    if (!appt?.agent || !currentUser) return false;
    return (appt.agent.id && appt.agent.id === currentUser.id) ||
      (appt.agent.email && appt.agent.email.toLowerCase() === currentUser.email?.toLowerCase());
  };
  const isOpenTour = (appt) => !appt?.agent;
  const isOtherAgentTour = (appt) => appt?.agent && !isMyTour(appt);

  const myActiveToursCount = appointments.filter(a =>
    isMyTour(a) && (a.status === 'CONFIRMED' || a.status === 'RESCHEDULED' || a.status === 'REQUESTED')
  ).length;

  const myCompletedToursCount = appointments.filter(a =>
    isMyTour(a) && a.status === 'COMPLETED'
  ).length;

  const openToursCount = appointments.filter(a =>
    isOpenTour(a) && a.status !== 'COMPLETED'
  ).length;

  // Agent visible appointments: Completed tours of any other agent are confidential and strictly hidden
  const agentVisibleAppointments = appointments.filter(appt =>
    !(isAgent && appt.status === 'COMPLETED' && !isMyTour(appt))
  );

  const isAtCapacity = isAgent && myActiveToursCount >= 3;

  // Buyer Counts
  const buyerUpcomingCount = appointments.filter(a => a.status !== 'COMPLETED').length;
  const buyerCompletedCount = appointments.filter(a => a.status === 'COMPLETED').length;

  const displayedAppointments = appointments.filter(appt => {
    // 1. Strict Agent Privacy Rule: Completed tours are strictly private to the conducting agent.
    // They are NEVER visible to other agents in any view or tab!
    if (isAgent && appt.status === 'COMPLETED' && !isMyTour(appt)) {
      return false;
    }

    if (isAgent) {
      if (agentTourFilter === 'OPEN') return isOpenTour(appt) && appt.status !== 'COMPLETED';
      if (agentTourFilter === 'MY_ACTIVE') return isMyTour(appt) && appt.status !== 'COMPLETED';
      if (agentTourFilter === 'COMPLETED') return isMyTour(appt) && appt.status === 'COMPLETED';
      return true; // 'ALL' tab
    }

    if (!isAgent && !isAdmin) {
      // Buyer filter tabs
      if (buyerTourFilter === 'UPCOMING') return appt.status !== 'COMPLETED';
      if (buyerTourFilter === 'COMPLETED') return appt.status === 'COMPLETED';
      return true; // 'ALL' tab
    }

    return true;
  });

  const handleAcceptTour = async (id) => {
    try {
      await api.acceptAppointment(id);
      if (showToast) showToast('You have accepted this tour and are now the assigned touring agent!', 'success');
      loadData();
    } catch (err) {
      if (showToast) showToast(err.message || 'Could not accept tour', 'error');
    }
  };

  const handleCancelAppointment = async (id) => {
    if (isAgent) {
      if (showToast) showToast('Agents cannot delete or cancel accepted viewing tours.', 'error');
      return;
    }
    const target = appointments.find(a => a.id === id);
    if (target?.status === 'COMPLETED') {
      if (showToast) showToast('Completed viewing tours cannot be cancelled.', 'error');
      return;
    }
    const ok = confirmAction
      ? await confirmAction('Are you sure you want to cancel this scheduled tour?', { title: 'Cancel viewing' })
      : window.confirm('Are you sure you want to cancel this scheduled tour?');
    if (!ok) return;
    try {
      await api.deleteAppointment(id);
      if (showToast) showToast('Appointment cancelled');
      loadData();
    } catch (err) {
      if (showToast) showToast('Cancellation failed: ' + err.message, 'error');
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '36px 32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-main)', marginBottom: '6px' }}>Viewing Tours & Private Inspections</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            Coordinate and manage private on-site inspection tours and residence walkthroughs with accredited agents.
          </p>
        </div>

        {/* Tours Stat Badge */}
        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-color)',
          padding: '8px 16px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.86rem',
          color: 'var(--text-main)',
          fontWeight: 600
        }}>
          <Calendar size={16} color="#d97706" />
          <span>Scheduled Tours: <strong>{appointments.length}</strong></span>
        </div>
      </div>

      {/* VIEWING TOURS LIST */}
      <div>
        {/* Agent Capacity & Dispatch Hub Banner */}
        {isAgent && (
          <div style={{
            background: isAtCapacity ? '#fffbeb' : '#f0fdf4',
            border: `1px solid ${isAtCapacity ? '#fde68a' : '#bbf7d0'}`,
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                background: isAtCapacity ? '#fef3c7' : '#dcfce7',
                color: isAtCapacity ? '#b45309' : '#15803d',
                width: '46px',
                height: '46px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1.15rem'
              }}>
                {myActiveToursCount}/3
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ margin: 0, color: '#0f172a', fontSize: '0.98rem' }}>
                    Agent Active Tour Workload
                  </h4>
                  {isAtCapacity ? (
                    <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      CAPACITY LIMIT REACHED (3/3)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                      {3 - myActiveToursCount} SLOTS AVAILABLE
                    </span>
                  )}
                </div>
                <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '0.82rem' }}>
                  {isAtCapacity
                    ? 'You hold 3 active tours. To accept new tour invitations, you must first complete or cancel your pending tours.'
                    : 'You can accept open tour invitations from prospective buyers up to a maximum of 3 concurrent active tours.'}
                </p>
              </div>
            </div>

            {/* Agent Filter Buttons */}
            <div style={{ display: 'flex', gap: '6px', background: '#ffffff', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
              <button
                onClick={() => setAgentTourFilter('ALL')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: agentTourFilter === 'ALL' ? '#0f294a' : 'transparent',
                  color: agentTourFilter === 'ALL' ? '#ffffff' : '#64748b',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                All Tours ({agentVisibleAppointments.length})
              </button>
              <button
                onClick={() => setAgentTourFilter('OPEN')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: agentTourFilter === 'OPEN' ? '#0f294a' : 'transparent',
                  color: agentTourFilter === 'OPEN' ? '#ffffff' : '#64748b',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Open Invitations ({openToursCount})
              </button>
              <button
                onClick={() => setAgentTourFilter('MY_ACTIVE')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: agentTourFilter === 'MY_ACTIVE' ? '#0f294a' : 'transparent',
                  color: agentTourFilter === 'MY_ACTIVE' ? '#ffffff' : '#64748b',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                My Active Tours ({myActiveToursCount})
              </button>
              <button
                onClick={() => setAgentTourFilter('COMPLETED')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: agentTourFilter === 'COMPLETED' ? '#15803d' : 'transparent',
                  color: agentTourFilter === 'COMPLETED' ? '#ffffff' : '#15803d',
                  border: agentTourFilter === 'COMPLETED' ? 'none' : '1px solid #bbf7d0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCircle2 size={13} /> Completed History ({myCompletedToursCount})
              </button>
            </div>
          </div>
        )}

        {/* Agent Completed Tours Informational Banner */}
        {isAgent && agentTourFilter === 'COMPLETED' && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#166534'
          }}>
            <CheckCircle2 size={20} color="#15803d" />
            <div>
              <strong style={{ fontSize: '0.92rem' }}>My Completed Tours History (Confidential)</strong>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#14532d' }}>
                These verified tour records represent walkthroughs completed by you. Completed tour histories are strictly private and not visible to other agents.
              </p>
            </div>
          </div>
        )}

        {/* Buyer Tour Filter Tabs */}
        {!isAgent && !isAdmin && (
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#0f294a" />
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                My Private Tour Appointments
              </span>
            </div>
            <div style={{ display: 'flex', gap: '6px', background: '#f8fafc', padding: '4px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <button
                onClick={() => setBuyerTourFilter('ALL')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: buyerTourFilter === 'ALL' ? '#0f294a' : 'transparent',
                  color: buyerTourFilter === 'ALL' ? '#ffffff' : '#64748b',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                All Tours ({appointments.length})
              </button>
              <button
                onClick={() => setBuyerTourFilter('UPCOMING')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: buyerTourFilter === 'UPCOMING' ? '#0f294a' : 'transparent',
                  color: buyerTourFilter === 'UPCOMING' ? '#ffffff' : '#64748b',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Upcoming / Scheduled ({buyerUpcomingCount})
              </button>
              <button
                onClick={() => setBuyerTourFilter('COMPLETED')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: buyerTourFilter === 'COMPLETED' ? '#15803d' : 'transparent',
                  color: buyerTourFilter === 'COMPLETED' ? '#ffffff' : '#15803d',
                  border: buyerTourFilter === 'COMPLETED' ? 'none' : '1px solid #bbf7d0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCircle2 size={13} /> Completed Tour History ({buyerCompletedCount})
              </button>
            </div>
          </div>
        )}

        {/* Buyer Completed Tours Informational Banner */}
        {!isAgent && !isAdmin && buyerTourFilter === 'COMPLETED' && (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#166534'
          }}>
            <CheckCircle2 size={20} color="#15803d" />
            <div>
              <strong style={{ fontSize: '0.92rem' }}>Completed Tour Walkthrough History</strong>
              <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#14532d' }}>
                Official record of residences you have viewed with accredited agents. You can share your feedback and experience by leaving a verified tour review.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading appointments...</div>
        ) : displayedAppointments.length === 0 ? (
          <div className="clean-card" style={{ textAlign: 'center', padding: '60px' }}>
            <Calendar size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
            <h3 style={{ color: '#0f172a', marginBottom: '6px' }}>No Scheduled Tours Found</h3>
            <p style={{ color: '#64748b' }}>
              {isAgent && agentTourFilter === 'OPEN'
                ? 'There are currently no open tour invitations waiting to be claimed.'
                : isAgent && agentTourFilter === 'MY_ACTIVE'
                  ? 'You do not have any active tours currently in progress.'
                  : isAgent && agentTourFilter === 'COMPLETED'
                    ? 'You have not completed any tours yet. When you complete tours, your confidential completion history will appear here.'
                    : !isAgent && !isAdmin && buyerTourFilter === 'COMPLETED'
                      ? 'You have no completed residence viewing tours yet. Once an assigned agent completes your tour, your walkthrough history will appear here.'
                      : !isAgent && !isAdmin && buyerTourFilter === 'UPCOMING'
                        ? 'You have no upcoming viewing tours scheduled. Browse "Explore Residences" to book a private walkthrough.'
                        : 'Browse "Explore Residences" to book your first private apartment walkthrough.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '20px' }}>
            {displayedAppointments.map((appt) => {
              const tourIsMine = isMyTour(appt);
              const tourIsOpen = isOpenTour(appt);
              const tourIsOtherAgent = isOtherAgentTour(appt);

              return (
                <div
                  key={appt.id}
                  className="clean-card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    border: tourIsOpen
                      ? '1.5px dashed #f59e0b'
                      : tourIsMine
                        ? '1.5px solid #10b981'
                        : '1px solid #e2e8f0',
                    background: tourIsOpen ? '#fffdfa' : tourIsMine ? '#f0fdf4' : '#ffffff',
                    boxShadow: tourIsMine ? '0 4px 12px rgba(16, 185, 129, 0.08)' : '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  {/* Top Tag / Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '8px' }}>
                    <div>
                      {appt.status === 'COMPLETED' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px'
                        }}>
                          <CheckCircle2 size={12} /> {tourIsMine ? 'My Completed Tour' : (!isAgent && !isAdmin ? 'Completed Walkthrough' : 'Completed Tour')}
                        </span>
                      ) : tourIsOpen ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#fef3c7',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px'
                        }}>
                          <Sparkles size={12} /> Open Invitation
                        </span>
                      ) : tourIsMine ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #bbf7d0',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '12px'
                        }}>
                          <CheckCircle2 size={12} /> My Assigned Tour
                        </span>
                      ) : tourIsOtherAgent ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#f1f5f9',
                          color: '#64748b',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px'
                        }}>
                          <Lock size={12} /> Claimed by {appt.agent?.fullName || 'Agent'}
                        </span>
                      ) : null}

                      <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginTop: '8px', marginBottom: '4px', fontWeight: 700 }}>
                        {appt.listing?.title || 'Premier Residence'}
                      </h3>
                      <p style={{ color: '#d97706', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
                        <MapPin size={13} /> {appt.listing?.city || 'Colombo'} • {appt.listing?.district || 'Colombo 03'}
                      </p>
                    </div>

                    <span className={`badge badge-${appt.status ? appt.status.toLowerCase() : 'available'}`} style={{ fontSize: '0.72rem', padding: '3px 9px' }}>
                      {appt.status}
                    </span>
                  </div>

                  {/* Tour Date & Details */}
                  <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.85rem', color: '#0f172a' }}>
                      <Calendar size={14} color="#0f294a" />
                      <strong>Date:</strong> {appt.appointmentDate}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.85rem', color: '#0f172a' }}>
                      <Clock size={14} color="#0f294a" />
                      <strong>Time Slot:</strong> {appt.appointmentTime}
                    </div>

                    {/* Buyer Information (for Agents/Admins) */}
                    {appt.buyer && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.82rem', color: '#334155' }}>
                        <User size={13} color="#64748b" />
                        <span><strong>Buyer:</strong> {appt.buyer.fullName || appt.buyer.email}</span>
                      </div>
                    )}

                    {/* Touring Agent Information */}
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', fontSize: '0.82rem' }}>
                      {appt.agent ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: tourIsMine ? '#15803d' : '#0f172a', fontWeight: 600 }}>
                          <UserCheck size={14} color={tourIsMine ? '#15803d' : '#2563eb'} />
                          <span>Touring Agent: {tourIsMine ? 'You (Assigned)' : appt.agent.fullName}</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d97706', fontStyle: 'italic' }}>
                          <Bell size={13} color="#d97706" />
                          <span>Open Invitation • Awaiting Agent Acceptance</span>
                        </div>
                      )}
                    </div>

                    {appt.notes && (
                      <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b' }}>
                        <strong>Notes:</strong> {appt.notes}
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                    {/* Agent Open Tour Claim Button */}
                    {isAgent && tourIsOpen && (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                          onClick={() => handleAcceptTour(appt.id)}
                          disabled={isAtCapacity}
                          className="btn-primary"
                          style={{
                            width: '100%',
                            padding: '8px 14px',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            background: isAtCapacity ? '#94a3b8' : 'linear-gradient(135deg, #0f294a 0%, #1e3a8a 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isAtCapacity ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                          title={isAtCapacity ? 'Capacity limit reached (3 active tours max). Complete pending tours first.' : 'Accept and become assigned touring agent'}
                        >
                          <UserCheck size={15} /> Accept & Become Touring Agent
                        </button>
                        {isAtCapacity && (
                          <span style={{ fontSize: '0.72rem', color: '#b91c1c', textAlign: 'center', fontWeight: 600 }}>
                            ⚠️ 3/3 active tours held. Complete pending tours to accept more.
                          </span>
                        )}
                      </div>
                    )}

                    {/* Agent / Admin Actions for Accepted Tours */}
                    {((isAgent && tourIsMine) || isAdmin) && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {appt.status !== 'CONFIRMED' && appt.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleQuickStatus(appt.id, 'CONFIRMED')}
                            className="btn-secondary"
                            style={{ fontSize: '0.82rem', padding: '6px 12px', color: '#15803d' }}
                          >
                            Confirm
                          </button>
                        )}
                        {appt.status === 'CONFIRMED' && (
                          <button
                            onClick={() => handleQuickStatus(appt.id, 'COMPLETED')}
                            className="btn-secondary"
                            style={{ fontSize: '0.82rem', padding: '6px 12px', color: '#2563eb', fontWeight: 600 }}
                          >
                            Complete Tour
                          </button>
                        )}
                        {/* Reschedule Button is removed when tour is COMPLETED */}
                        {appt.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleOpenReschedule(appt)}
                            className="btn-secondary"
                            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                          >
                            Reschedule
                          </button>
                        )}
                        {appt.status === 'COMPLETED' && (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.78rem',
                            color: '#15803d',
                            background: '#dcfce7',
                            border: '1px solid #bbf7d0',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontWeight: 700
                          }}>
                            <CheckCircle2 size={13} /> Completed Tour Record
                          </span>
                        )}
                      </div>
                    )}

                    {/* Buyer Actions for their tours */}
                    {!isAgent && !isAdmin && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {appt.status === 'COMPLETED' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.78rem',
                              color: '#15803d',
                              background: '#dcfce7',
                              border: '1px solid #bbf7d0',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              fontWeight: 700
                            }}>
                              <CheckCircle2 size={13} /> Walkthrough Completed
                            </span>
                            <button
                              onClick={() => handleOpenReviewModal(appt)}
                              className="btn-primary"
                              style={{
                                fontSize: '0.82rem',
                                padding: '6px 14px',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                border: 'none',
                                color: '#ffffff',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.28)'
                              }}
                              title="Write or edit verified review for this completed tour"
                            >
                              <Star size={14} fill="#ffffff" /> Review Tour Experience
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenReschedule(appt)}
                            className="btn-secondary"
                            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                          >
                            Reschedule
                          </button>
                        )}
                      </div>
                    )}

                    {/* Other agent viewing claimed tour: Read-only notice */}
                    {isAgent && tourIsOtherAgent && (
                      <div style={{ width: '100%', textAlign: 'center', padding: '6px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b' }}>
                        <Lock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                        Claimed by {appt.agent?.fullName || 'another agent'}. Exclusively assigned.
                      </div>
                    )}

                    {/* Delete / Cancel Button (only for buyers and admins; agents cannot delete accepted tours) */}
                    {!isAgent && appt.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="btn-danger"
                        style={{ padding: '6px 10px' }}
                        title="Cancel Tour Appointment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RESCHEDULE MODAL */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px', width: '100%' }}>
            <button
              onClick={() => setEditModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.3rem', color: '#0f172a', marginBottom: '6px' }}>Reschedule Viewing Tour</h2>
            <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '18px' }}>
              Adjust date, time, or confirmation status for this appointment.
            </p>

            <form onSubmit={handleSaveReschedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>New Date *</label>
                <input
                  type="date"
                  required
                  value={rescheduleData.appointmentDate}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, appointmentDate: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Time Slot *</label>
                <select
                  value={rescheduleData.appointmentTime}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, appointmentTime: e.target.value })}
                  style={{ width: '100%' }}
                >
                  <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                  <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                  <option value="11:30 AM - 12:30 PM">11:30 AM - 12:30 PM</option>
                  <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                  <option value="04:30 PM - 05:30 PM">04:30 PM - 05:30 PM</option>
                </select>
              </div>

              {(currentUser?.role === 'AGENT' || currentUser?.role === 'ADMIN') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Status</label>
                  <select
                    value={rescheduleData.status}
                    onChange={(e) => setRescheduleData({ ...rescheduleData, status: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="REQUESTED">Requested</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Notes</label>
                <textarea
                  rows="2"
                  value={rescheduleData.notes}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, notes: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setEditModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOUR REVIEW MODAL (FOR COMPLETED VIEWING TOURS) */}
      {reviewModalOpen && reviewAppt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', width: '100%', padding: '28px' }}>
            <button
              onClick={() => { setReviewModalOpen(false); setReviewAppt(null); }}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={24} color="#d97706" fill="#d97706" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>
                  {existingUserReview ? 'Edit Your Tour Review' : 'Review Your Viewing Tour'}
                </h2>
                <span style={{ fontSize: '0.84rem', color: '#d97706', fontWeight: 600 }}>
                  Verified Tour Inspection • {reviewAppt.listing?.title || 'Apartment'}
                </span>
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#166534' }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>
                On-site tour completed on <strong>{reviewAppt.appointmentDate}</strong> ({reviewAppt.appointmentTime}).
              </span>
            </div>

            {reviewLoading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Checking review records...</div>
            ) : (
              <form onSubmit={handleSaveTourReview} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Inspection Rating *
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <Star
                            size={28}
                            fill={star <= reviewRating ? '#f59e0b' : 'none'}
                            color={star <= reviewRating ? '#f59e0b' : '#cbd5e1'}
                          />
                        </button>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600, marginLeft: '6px' }}>
                      {reviewRating === 5 && '5/5 — Exceptional Walkthrough'}
                      {reviewRating === 4 && '4/5 — Very Good Unit & Tour'}
                      {reviewRating === 3 && '3/5 — Satisfactory Tour'}
                      {reviewRating === 2 && '2/5 — Needs Improvement'}
                      {reviewRating === 1 && '1/5 — Disappointing Experience'}
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Feedback & Tour Impressions *
                  </label>
                  <textarea
                    rows="4"
                    required
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share your firsthand impressions of the apartment layout, lighting, finishes, building facilities, and tour walkthrough..."
                    className="form-input"
                    style={{ width: '100%', resize: 'vertical', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => { setReviewModalOpen(false); setReviewAppt(null); }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting || !reviewComment.trim()}
                    className="btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #0f294a 0%, #1e3a8a 100%)',
                      padding: '8px 20px',
                      fontWeight: 700
                    }}
                  >
                    {reviewSubmitting ? 'Posting...' : existingUserReview ? 'Save Updated Review' : 'Post Verified Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
