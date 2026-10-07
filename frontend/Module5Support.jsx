import React, { useState, useEffect } from 'react';
import { LifeBuoy, Star, MessageSquare, AlertCircle, CheckCircle2, Clock, Send, Trash2, Edit3, X, ShieldAlert, Lock, Building, ShieldCheck, Shield } from 'lucide-react';
import { api } from '../api';

export default function Module5Support({ currentUser, showToast, confirmAction, openAuthModal }) {
  const [tickets, setTickets] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ticket creation / edit modal
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState(null);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'GENERAL',
    priority: 'MEDIUM',
    message: '',
    listingId: null
  });

  // Reply / Staff update modal
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState(null);
  const [staffResponseText, setStaffResponseText] = useState('');
  const [updatedStatus, setUpdatedStatus] = useState('IN_PROGRESS');

  const handleOpenEditTicket = (ticket) => {
    setEditingTicketId(ticket.id);
    setTicketForm({
      subject: ticket.subject || '',
      category: ticket.category || 'GENERAL',
      priority: ticket.priority || 'MEDIUM',
      message: ticket.message || '',
      listingId: ticket.listing?.id || null
    });
    setTicketModalOpen(true);
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const isStaffOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'AGENT' || currentUser?.role === 'STAFF' || currentUser?.role === 'SUPPORT_ADMIN';
      const data = isStaffOrAdmin
        ? await api.getAllTickets().catch(() => [])
        : await api.getMyTickets().catch(() => []);

      setTickets(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  useEffect(() => {
    api.getAllListings().then(res => setListings(res || [])).catch(() => []);
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      if (showToast) showToast('Please sign in to submit a customer inquiry.', 'error');
      if (openAuthModal) openAuthModal();
      return;
    }
    try {
      if (editingTicketId) {
        // Update existing ticket
        await api.updateTicket(editingTicketId, ticketForm);
        if (showToast) showToast('Support inquiry updated successfully!');
      } else {
        // Create new ticket
        await api.createTicket(ticketForm);
        if (showToast) showToast('Customer inquiry submitted successfully!');
      }
      setTicketModalOpen(false);
      setEditingTicketId(null);
      setTicketForm({ subject: '', category: 'GENERAL', priority: 'MEDIUM', message: '', listingId: null });
      loadTickets();
    } catch (err) {
      const errorText = err.message || '';
      const isForbidden = errorText.includes('403') || err.status === 403;
      if (isForbidden) {
        if (showToast) showToast('Session expired or unauthorized. Please sign in again.', 'error');
        if (openAuthModal) openAuthModal();
      } else {
        if (showToast) showToast('Failed to submit ticket: ' + errorText, 'error');
      }
    }
  };


  const handleOpenReply = (ticket) => {
    setActiveTicket(ticket);
    setStaffResponseText(ticket.staffResponse || '');
    const initialStatus = (!ticket.status || ticket.status === 'OPEN') ? 'IN_PROGRESS' : ticket.status;
    setUpdatedStatus(initialStatus);
    setReplyModalOpen(true);
  };

  const handleSaveStaffReply = async (e) => {
    e.preventDefault();
    if (activeTicket?.status === 'RESOLVED' || activeTicket?.status === 'CLOSED') {
      if (showToast) showToast('No one can edit inquiries after completion.', 'error');
      return;
    }
    const finalStatus = (updatedStatus === 'OPEN' || !updatedStatus) ? 'IN_PROGRESS' : updatedStatus;
    if ((finalStatus === 'RESOLVED' || finalStatus === 'CLOSED') && !staffResponseText.trim()) {
      if (showToast) showToast('A resolution comment is mandatory to resolve or close a support ticket.', 'error');
      return;
    }
    try {
      await api.updateTicket(activeTicket.id, {
        staffResponse: staffResponseText.trim(),
        status: finalStatus
      });
      if (showToast) showToast(`Ticket #${activeTicket.id} updated successfully!`);
      setReplyModalOpen(false);
      loadTickets();
    } catch (err) {
      if (showToast) showToast('Failed to update ticket: ' + err.message, 'error');
    }
  };

  const handleDeleteTicket = async (id) => {
    const targetTicket = tickets.find(t => t.id === id);
    if (targetTicket && (targetTicket.status === 'RESOLVED' || targetTicket.status === 'CLOSED')) {
      if (showToast) showToast('Inquiries cannot be deleted after completion.', 'error');
      return;
    }
    const isTargetAuthor = currentUser && (
      ((targetTicket?.user || targetTicket?.client)?.id && (targetTicket?.user || targetTicket?.client)?.id === currentUser.id) ||
      ((targetTicket?.user || targetTicket?.client)?.email && (targetTicket?.user || targetTicket?.client)?.email?.toLowerCase() === currentUser.email?.toLowerCase())
    );
    if (currentUser?.role === 'AGENT' && !isTargetAuthor && currentUser?.role !== 'ADMIN') {
      if (showToast) showToast('Agents are not authorized to delete other clients\' inquiries.', 'error');
      return;
    }
    const ok = confirmAction
      ? await confirmAction('Are you sure you want to remove this support ticket?', { title: 'Delete ticket' })
      : window.confirm('Are you sure you want to remove this support ticket?');
    if (!ok) return;
    try {
      await api.deleteTicket(id);
      if (showToast) showToast('Ticket deleted');
      loadTickets();
    } catch (err) {
      if (showToast) showToast('Delete failed: ' + err.message, 'error');
    }
  };

  const getCategoryLabel = (cat) => {
    switch (cat) {
      case 'PROPERTY_INQUIRY': return 'Property & Apartment Inquiry';
      case 'LISTING_INQUIRY': return 'Property & Apartment Inquiry';
      case 'LEGAL_DEED': return 'Legal Deed & Title Conveyancing';
      case 'MORTGAGE_FINANCING': return 'Bank Mortgage & Financing';
      case 'HANDOVER_KEYS': return 'Unit Handover & Key Collection';
      default: return 'General Inquiries';
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '36px 32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', color: '#0f172a', marginBottom: '6px' }}>
            {currentUser?.role === 'SELLER'
              ? 'Property Seller Support & Inquiries'
              : currentUser?.role === 'AGENT'
              ? 'Agent Desk & Client Inquiries'
              : 'Customer Inquiries & Support Desk'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>
            {currentUser?.role === 'SELLER'
              ? 'Submit inquiries directly to the Super Administrator regarding listings, verifications, and approvals.'
              : currentUser?.role === 'AGENT'
              ? 'Review unreplied buyer inquiries to assist clients, or submit inquiries directly to the Super Administrator.'
              : 'Dedicated resident assistance for property questions, legal title verification, mortgage facilities, and key handovers.'}
          </p>
        </div>

        <button
          onClick={() => {
            if (!currentUser) {
              if (showToast) showToast('Please sign in to open a support request.', 'error');
              if (openAuthModal) openAuthModal();
              return;
            }
            setEditingTicketId(null);
            setTicketForm({ subject: '', category: 'GENERAL', priority: 'MEDIUM', message: '', listingId: null });
            setTicketModalOpen(true);
          }}

          className="btn-primary"
          style={{ padding: '12px 22px' }}
        >
          <LifeBuoy size={18} /> {currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT' ? 'Submit Inquiry to Super Admin' : 'Open Support Request'}
        </button>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading customer tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="clean-card" style={{ textAlign: 'center', padding: '60px' }}>
          <LifeBuoy size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ color: '#0f172a', marginBottom: '6px' }}>No Active Requests</h3>
          <p style={{ color: '#64748b' }}>Submit a support request for deed advisory, payment questions, or handover inquiries.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 370px))', gap: '18px' }}>
          {tickets.map((ticket) => {
            const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
            const isInProgress = ticket.status === 'IN_PROGRESS';
            const isOpen = !ticket.status || ticket.status === 'OPEN';
            const responder = ticket.responder;
            const isMyAssigned = responder && (
              (currentUser?.id && responder.id === currentUser.id) ||
              (currentUser?.email && responder.email?.toLowerCase() === currentUser.email?.toLowerCase())
            );
            const isAuthor = currentUser && (
              ((ticket.user || ticket.client)?.id && (ticket.user || ticket.client)?.id === currentUser.id) ||
              ((ticket.user || ticket.client)?.email && (ticket.user || ticket.client)?.email?.toLowerCase() === currentUser.email?.toLowerCase())
            );
            const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'AGENT' || currentUser?.role === 'STAFF' || currentUser?.role === 'SUPPORT_ADMIN';
            const authorRole = (ticket.user || ticket.client)?.role || 'BUYER';
            const isBuyerSubmitted = authorRole === 'BUYER';
            const canDelete = !isResolved && (isAuthor || currentUser?.role === 'ADMIN');

            return (
              <div key={ticket.id} className="clean-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span className={`badge badge-${isResolved ? 'available' : isInProgress ? 'reserved' : 'sold'}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                        {isResolved ? 'SOLVED' : ticket.status || 'OPEN'}
                      </span>
                      <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {ticket.priority} Priority
                      </span>
                      {responder && (
                        <span style={{ fontSize: '0.7rem', background: isResolved ? '#dcfce7' : '#dbeafe', color: isResolved ? '#15803d' : '#1e40af', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          {isResolved ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {responder.fullName} ({responder.role === 'ADMIN' ? 'Admin' : responder.role === 'SUPPORT_ADMIN' ? 'Support Admin' : responder.role === 'AGENT' ? 'Agent' : responder.role})
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '1.02rem', color: '#0f172a', margin: '0 0 3px', lineHeight: 1.3 }}>
                      {ticket.subject}
                    </h3>
                    <p style={{ fontSize: '0.76rem', color: '#d97706', fontWeight: 600, margin: 0 }}>
                      {getCategoryLabel(ticket.category)}
                    </p>
                    {ticket.listing && (
                      <div style={{ marginTop: '5px', fontSize: '0.78rem', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                        <Building size={12} color="#2563eb" /> {ticket.listing.title} ({ticket.listing.city})
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'Recent'}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px', fontSize: '0.84rem', color: '#334155', lineHeight: 1.5 }}>
                  {ticket.message}
                </div>

                {ticket.staffResponse ? (
                  <div style={{
                    background: isResolved ? '#f0fdf4' : '#eff6ff',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${isResolved ? '#bbf7d0' : '#bfdbfe'}`,
                    marginBottom: '10px',
                    fontSize: '0.84rem',
                    color: isResolved ? '#166534' : '#1e40af'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 700, flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isResolved ? <CheckCircle2 size={14} color="#166534" /> : <Clock size={14} color="#1d4ed8" />}
                        {isResolved ? 'Confirmed Resolution (Solved):' : 'In-Progress Resolution:'}
                      </span>
                      {responder && (
                        <span style={{ fontSize: '0.72rem', background: isResolved ? '#dcfce7' : '#dbeafe', color: isResolved ? '#15803d' : '#1e40af', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          By: {responder.fullName}
                        </span>
                      )}
                    </div>
                    <div>{ticket.staffResponse}</div>
                    {isResolved && (
                      <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '6px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Lock size={11} /> Confirmed as solved — permanently locked from editing.
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: '#fefce8', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fef08a', marginBottom: '10px', fontSize: '0.78rem', color: '#854d0e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} color="#854d0e" /> Awaiting official review & response
                  </div>
                )}

                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                    Client: <strong>{(ticket.user || ticket.client)?.fullName || currentUser?.fullName || 'Valued Resident'}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* CASE 1: TICKET IS SOLVED / COMPLETED -> Permanent Lock (No one can edit or delete) */}
                    {isResolved && (
                      <span style={{ fontSize: '0.76rem', color: '#166534', background: '#dcfce7', padding: '4px 10px', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Solved & Locked
                      </span>
                    )}

                    {/* CASE 2: TICKET IS IN_PROGRESS */}
                    {!isResolved && isInProgress && (
                      <>
                        {/* Agent can edit inquiries submitted by buyer */}
                        {currentUser?.role === 'AGENT' && !isAuthor && isBuyerSubmitted && (
                          <button onClick={() => handleOpenReply(ticket)} className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                            <Edit3 size={13} /> Edit Response
                          </button>
                        )}

                        {/* Super Admin or Support Admin */}
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPPORT_ADMIN') && !isAuthor && (
                          <button onClick={() => handleOpenReply(ticket)} className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                            <Edit3 size={13} /> Edit Response
                          </button>
                        )}

                        {/* Ticket Author (Buyer, Seller, or Agent editing their own submitted inquiry) */}
                        {isAuthor && (
                          <>
                            {(currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT') && (
                              <span style={{ fontSize: '0.72rem', color: '#6d28d9', background: '#ede9fe', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                Sent to Super Admin
                              </span>
                            )}
                            <button onClick={() => handleOpenEditTicket(ticket)} className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                              <Edit3 size={13} /> Edit Ticket
                            </button>
                          </>
                        )}

                        {/* Deletion: Agent can delete only inquiries submitted by himself */}
                        {canDelete && (
                          <button onClick={() => handleDeleteTicket(ticket.id)} className="btn-danger" style={{ padding: '6px 10px' }} title="Delete Ticket">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </>
                    )}

                    {/* CASE 3: TICKET IS OPEN (UNCLAIMED) */}
                    {!isResolved && !isInProgress && (
                      <>
                        {/* Agent can edit / reply to inquiries submitted by buyer */}
                        {currentUser?.role === 'AGENT' && !isAuthor && isBuyerSubmitted && (
                          <button onClick={() => handleOpenReply(ticket)} className={ticket.staffResponse ? 'btn-secondary' : 'btn-primary'} style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                            <Edit3 size={13} /> {ticket.staffResponse ? 'Edit Response' : 'Reply to Buyer as Agent'}
                          </button>
                        )}

                        {/* Customer Support Admin or Super Admin responding */}
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPPORT_ADMIN') && !isAuthor && (
                          <button onClick={() => handleOpenReply(ticket)} className="btn-primary" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                            <Edit3 size={13} /> Respond as {currentUser.role === 'ADMIN' ? 'Super Admin' : 'Support Admin'}
                          </button>
                        )}

                        {/* Ticket Author (Buyer, Seller, or Agent editing their own submitted inquiry) */}
                        {isAuthor && (
                          <>
                            {(currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT') && (
                              <span style={{ fontSize: '0.72rem', color: '#6d28d9', background: '#ede9fe', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                Sent to Super Admin
                              </span>
                            )}
                            <button onClick={() => handleOpenEditTicket(ticket)} className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                              <Edit3 size={13} /> Edit Ticket
                            </button>
                          </>
                        )}

                        {/* Deletion: Agent can delete only inquiries submitted by himself */}
                        {canDelete && (
                          <button onClick={() => handleDeleteTicket(ticket.id)} className="btn-danger" style={{ padding: '6px 10px' }} title="Delete Ticket">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE TICKET MODAL */}
      {ticketModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '100%' }}>
            <button
              onClick={() => setTicketModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '6px' }}>
              {currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT'
                ? 'Submit Inquiry to Super Administrator'
                : 'Open Customer Inquiry Request'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '18px' }}>
              {currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT'
                ? `As a registered ${currentUser.role === 'SELLER' ? 'Property Seller' : 'Agent'}, your inquiry will be routed directly and exclusively to the Super Administrator.`
                : 'Our customer support team and certified agents will review your query and provide verified documentation.'}
            </p>

            <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT') && (
                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="#7c3aed" style={{ flexShrink: 0 }} />
                  <span><strong>Routing Notice:</strong> This inquiry goes directly to the <strong>Super Administrator</strong> for exclusive review and response.</span>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Subject / Issue Headline *</label>
                <input
                  type="text"
                  required
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                  style={{ width: '100%' }}
                  placeholder="e.g. Legal Deed Inquiry for Galle Face Apartment"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Category</label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="PROPERTY_INQUIRY">Property & Apartment Inquiry</option>
                    <option value="GENERAL">General Inquiries</option>
                    <option value="LEGAL_DEED">Legal Deed & Title</option>
                    <option value="MORTGAGE_FINANCING">Bank Mortgage</option>
                    <option value="HANDOVER_KEYS">Unit Handover & Keys</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Priority Level</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Related Residence Listing (Optional)
                </label>
                <select
                  value={ticketForm.listingId || ''}
                  onChange={(e) => setTicketForm({ ...ticketForm, listingId: e.target.value ? Number(e.target.value) : null })}
                  style={{ width: '100%' }}
                >
                  <option value="">-- No specific residence / General inquiry --</option>
                  {listings.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title} ({l.city}) - LKR {(l.price || 0).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Detailed Explanation *</label>
                <textarea
                  rows="4"
                  required
                  value={ticketForm.message}
                  onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                  placeholder="Please describe your question or issue in detail..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setTicketModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF REPLY MODAL */}
      {replyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '100%' }}>
            <button
              onClick={() => setReplyModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '6px' }}>Staff Resolution & Response</h2>
            <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '16px' }}>
              Ticket: <strong>{activeTicket?.subject}</strong>
            </p>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '0.86rem', color: '#475569' }}>
              "{activeTicket?.message}"
            </div>

            <form onSubmit={handleSaveStaffReply} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Status Update *</label>
                <select
                  value={updatedStatus}
                  onChange={(e) => setUpdatedStatus(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="IN_PROGRESS">IN PROGRESS (Under review — you can edit or delete later)</option>
                  <option value="RESOLVED">CONFIRMED AS SOLVED (Permanently locks this ticket)</option>
                </select>
              </div>

              <div style={{
                background: updatedStatus === 'RESOLVED' ? '#fef2f2' : '#f0f9ff',
                padding: '10px 12px',
                borderRadius: '8px',
                border: `1px solid ${updatedStatus === 'RESOLVED' ? '#fecaca' : '#bae6fd'}`,
                fontSize: '0.8rem',
                color: updatedStatus === 'RESOLVED' ? '#991b1b' : '#0369a1'
              }}>
                {updatedStatus === 'RESOLVED' ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <Lock size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Permanent Lock:</strong> Confirming as Solved will permanently close and lock this ticket. Neither you ({currentUser?.fullName}) nor any other member (Admin or Agent) will be able to edit or delete it afterwards.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <Clock size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Single-Member Exclusivity:</strong> By keeping this In Progress, this ticket is assigned exclusively to you ({currentUser?.fullName}). Other agents and admins cannot edit or reply to it. Only you can edit or delete it.
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Official Resolution Note *</label>
                <textarea
                  rows="4"
                  required
                  value={staffResponseText}
                  onChange={(e) => setStaffResponseText(e.target.value)}
                  placeholder="State the resolution, deed status, or actions taken..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setReplyModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {updatedStatus === 'RESOLVED' ? 'Confirm as Solved & Lock' : 'Save as In Progress'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
