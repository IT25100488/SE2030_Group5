import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Shield, TrendingUp, Users, Building, DollarSign, Megaphone, Activity, Trash2, Edit2, Plus, Database, CheckCircle2, X, Bell, Search, LifeBuoy, Check, UserCheck, Calendar, Clock, Phone, MapPin, Receipt, FileText, CreditCard, Building2, Printer, Lock, Award, RotateCcw, XCircle, Star, MessageSquare, AlertTriangle } from 'lucide-react';
import { api } from '../api';
import RefundModal from './RefundModal';

const formatAdminPaymentMethod = (method) => {
  if (!method) return 'Awaiting Deposit';
  switch (method) {
    case 'BANK_WIRE':
    case 'BANK_TRANSFER':
    case 'RTGS_TRANSFER':
    case 'RTGS':
      return 'Direct RTGS / Bank Wire';
    case 'BANKERS_DRAFT':
    case 'MANAGERS_CHEQUE':
      return "Banker's Draft / Manager's Cheque";
    case 'BANK_SLIP_UPLOAD':
    case 'SLIP_UPLOAD':
    case 'ESCROW_DEPOSIT':
      return 'Accredited Escrow Deposit Slip';
    case 'CREDIT_DEBIT_CARD':
      return 'Credit / Debit Card';
    default:
      return method.replace(/_/g, ' ');
  }
};

const formatAuditModule = (mod) => {
  if (!mod) return 'System Core';
  switch (mod) {
    case 'MODULE_1_LISTINGS':
      return 'Listings (Mod 1)';
    case 'MODULE_2_SEARCH':
      return 'Search (Mod 2)';
    case 'MODULE_3_INQUIRY_VIEWING':
      return 'Inquiries & Viewings (Mod 3)';
    case 'MODULE_4_TRANSACTIONS':
      return 'Transactions & Sales (Mod 4)';
    case 'MODULE_5_SUPPORT':
      return 'Customer Support (Mod 5)';
    case 'MODULE_6_ADMIN':
      return 'System Admin (Mod 6)';
    default:
      return mod.replace(/^MODULE_\d+_?/, '').replace(/_/g, ' ') || mod;
  }
};

const formatShortStaffName = (name) => {
  if (!name) return 'Staff';
  const clean = name.split(' - ')[0].trim();
  const parts = clean.split(/\s+/);
  if (parts.length > 1) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  return clean;
};

export default function Module6Admin({ currentUser, showToast, confirmAction, onAnnouncementChange, initialTab = 'overview', adminTab: propAdminTab, setAdminTab: propSetAdminTab }) {
  const [localAdminTab, setLocalAdminTab] = useState(initialTab);
  const adminTab = propAdminTab !== undefined ? propAdminTab : localAdminTab;
  const _setAdminTab = propSetAdminTab || setLocalAdminTab;

  const userRole = currentUser?.role || 'ADMIN';
  const isSuperAdmin = userRole === 'ADMIN';
  const isFinanceAdmin = userRole === 'FINANCE_ADMIN';
  const isSupportAdmin = userRole === 'SUPPORT_ADMIN';

  const [metrics, setMetrics] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [allAgents, setAllAgents] = useState([]);
  const [_loading, setLoading] = useState(false);

  // Customer Reviews Moderation State (Support Admin)
  const [allReviews, setAllReviews] = useState([]);
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewRatingFilter, setReviewRatingFilter] = useState('ALL');

  // Filters & searches
  const [listingFilter, setListingFilter] = useState('AVAILABLE');
  const [userSearch, setUserSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [viewingStatusFilter, setViewingStatusFilter] = useState('ALL');
  const [viewingSearch, setViewingSearch] = useState('');

  // Reset to AVAILABLE tab whenever navigating to Listing Moderation
  useEffect(() => {
    if (adminTab === 'listings') {
      setListingFilter('AVAILABLE');
    }
  }, [adminTab]);

  // Viewing Edit Modal State
  const [viewingModalOpen, setViewingModalOpen] = useState(false);
  const [editingViewing, setEditingViewing] = useState(null);

  // Listing Edit / Reassign Seller Modal State
  const [editListingModalOpen, setEditListingModalOpen] = useState(false);
  const [editingListingData, setEditingListingData] = useState(null);
  const [viewingForm, setViewingForm] = useState({
    listingId: null,
    appointmentDate: '',
    appointmentTime: '10:00 AM - 11:00 AM',
    status: 'REQUESTED',
    agentId: '',
    notes: ''
  });

  // Announcement Modal
  const [annModalOpen, setAnnModalOpen] = useState(false);
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [annForm, setAnnForm] = useState({
    title: '',
    content: '',
    targetRole: 'ALL',
    priority: 'INFO',
    active: true
  });

  // Customer Inquiries Tickets State
  const [inquiryTickets, setInquiryTickets] = useState([]);
  const [ticketReplyModalOpen, setTicketReplyModalOpen] = useState(false);

  // Self-Deletion Error Popup Modal
  const [selfDeleteErrorModal, setSelfDeleteErrorModal] = useState(false);
  const [activeAdminTicket, setActiveAdminTicket] = useState(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [adminTicketStatus, setAdminTicketStatus] = useState('RESOLVED');
  const [ticketFilterStatus, setTicketFilterStatus] = useState('ALL');
  const [adminInquirySegment, setAdminInquirySegment] = useState('ALL'); // 'ALL' | 'SELLER_AGENT' | 'BUYER'

  // Finance Department Reservations State
  const [allReservations, setAllReservations] = useState([]);
  const [tourFinanceSubTab, setTourFinanceSubTab] = useState('reservations'); // 'reservations' | 'viewings'
  const [reservationStatusFilter, setReservationStatusFilter] = useState('ALL');
  const [reservationSearch, setReservationSearch] = useState('');
  const [adminInvoiceModalOpen, setAdminInvoiceModalOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);

  // Refund / Cancellation Modal (Admin)
  const [adminRefundModalOpen, setAdminRefundModalOpen] = useState(false);
  const [adminCancelTargetTxn, setAdminCancelTargetTxn] = useState(null);

  const handleOpenAdminRefundModal = (txn) => {
    setAdminCancelTargetTxn(txn);
    setAdminRefundModalOpen(true);
  };

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [stats, anns, logs, listings, users, appts, agents, tickets, txns, reviews] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getAllAnnouncements().catch(() => []),
        api.getAuditLogs().catch(() => []),
        api.getAllListings().catch(() => []),
        api.getAllUsers().catch(() => []),
        api.getAllAppointments().catch(() => []),
        api.getAgents().catch(() => []),
        api.getAllTickets().catch(() => []),
        api.getAllTransactions().catch(() => []),
        api.getAllReviews().catch(() => [])
      ]);
      setMetrics(stats);
      setAnnouncements(anns || []);
      setAuditLogs(logs || []);
      // Super Admin sees all listings (Drafts, Available, Revoked, etc.) to moderate and grant access or revoke
      setAllListings((listings || []).slice().sort((a, b) => (b.id || 0) - (a.id || 0)));
      setAllUsers(users || []);
      setAllAppointments(appts || []);
      setAllAgents(agents || []);
      setInquiryTickets(tickets || []);
      setAllReservations(txns || []);
      setAllReviews(reviews || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // --- CUSTOMER REVIEWS MODERATION (Support Admin) ---
  const handleDeleteCustomerReview = async (reviewId, listingTitle, reviewerName) => {
    const titleDesc = listingTitle ? ` for "${listingTitle}"` : '';
    const authorDesc = reviewerName ? ` by ${reviewerName}` : '';
    const ok = confirmAction
      ? await confirmAction(`Are you sure you want to permanently delete this customer review${titleDesc}${authorDesc}? This action cannot be undone.`, { title: 'Delete Customer Review' })
      : window.confirm(`Are you sure you want to permanently delete this customer review${titleDesc}${authorDesc}? This action cannot be undone.`);
    if (!ok) return;

    try {
      await api.deleteReview(reviewId);
      setAllReviews(prev => prev.filter(r => r.id !== reviewId));
      if (showToast) showToast('Customer review deleted successfully.', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to delete review.', 'error');
    }
  };

  const filteredReviews = useMemo(() => {
    return allReviews.filter(r => {
      if (reviewRatingFilter !== 'ALL' && String(r.rating) !== String(reviewRatingFilter)) {
        return false;
      }
      if (reviewSearch.trim()) {
        const q = reviewSearch.toLowerCase();
        const matchListing = r.listing?.title?.toLowerCase().includes(q) ||
                             r.listing?.city?.toLowerCase().includes(q) ||
                             r.listing?.district?.toLowerCase().includes(q);
        const matchUser = r.user?.fullName?.toLowerCase().includes(q) ||
                          r.user?.email?.toLowerCase().includes(q);
        const matchComment = r.comment?.toLowerCase().includes(q);
        if (!matchListing && !matchUser && !matchComment) return false;
      }
      return true;
    });
  }, [allReviews, reviewRatingFilter, reviewSearch]);

  const reviewStats = useMemo(() => {
    const total = allReviews.length;
    const avg = total > 0 ? (allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total).toFixed(1) : '5.0';
    const fiveStar = allReviews.filter(r => r.rating === 5).length;
    const fourStar = allReviews.filter(r => r.rating === 4).length;
    const threeStar = allReviews.filter(r => r.rating === 3).length;
    const lowStar = allReviews.filter(r => r.rating && r.rating <= 2).length;
    return { total, avg, fiveStar, fourStar, threeStar, lowStar };
  }, [allReviews]);

  // --- FINANCE RESERVATIONS CRUD & CLEARANCE ---
  const handleAdminUpdateReservationStatus = async (id, newStatus, invoiceNo) => {
    try {
      await api.updateTransactionStatus(id, newStatus);
      if (showToast) showToast(newStatus === 'CONFIRMED'
        ? `Payment for reservation ${invoiceNo || '#' + id} verified & confirmed!`
        : `Reservation ${invoiceNo || '#' + id} marked as ${newStatus}`);
      loadAdminData();
    } catch (err) {
      if (showToast) showToast('Status update failed: ' + err.message, 'error');
    }
  };

  const handleAdminConfirmPayment = (id, invoiceNo) => {
    handleAdminUpdateReservationStatus(id, 'CONFIRMED', invoiceNo);
  };

  const handleAdminDeclinePayment = (id, invoiceNo) => {
    const txn = allReservations.find(t => t.id === id);
    if (txn) {
      handleOpenAdminRefundModal(txn);
    } else {
      handleOpenAdminRefundModal({ id, invoiceNumber: invoiceNo });
    }
  };

  const handleAdminCancelUnpaidReservation = async (id, invoiceNo) => {
    if (!window.confirm(`Cancel unpaid reservation ${invoiceNo}? Since no payment was made, the apartment will be released back to available without a refund.`)) {
      return;
    }
    try {
      await api.cancelReservation(id);
      if (showToast) showToast(`Unpaid reservation ${invoiceNo} cancelled. Unit released.`);
      loadAdminData();
    } catch (err) {
      if (showToast) showToast('Failed to cancel reservation: ' + err.message, 'error');
    }
  };

  const handleAdminCancelReservation = (id, invoiceNo) => {
    const txn = allReservations.find(t => t.id === id);
    const hasPaid = !!(txn && (txn.paymentDate || txn.status === 'PAYMENT_PENDING' || txn.status === 'PAYMENT_RECEIVED' || txn.status === 'CONFIRMED' || txn.status === 'COMPLETED'));
    if (txn && !hasPaid) {
      handleAdminCancelUnpaidReservation(id, invoiceNo);
    } else if (txn) {
      handleOpenAdminRefundModal(txn);
    } else {
      handleOpenAdminRefundModal({ id, invoiceNumber: invoiceNo });
    }
  };

  const handleViewAdminInvoice = (txn) => {
    setSelectedInvoiceData(txn);
    setAdminInvoiceModalOpen(true);
  };

  // --- LISTING APPROVAL & MODERATION ---
  const handleUpdateListingStatus = async (id, title, newStatus) => {
    try {
      await api.updateListingStatus(id, newStatus);
      if (showToast) {
        if (newStatus === 'AVAILABLE') {
          showToast(`Super Admin granted access for "${title}"! Live under "AVAILABLE (LIVE)" and on homepage listings.`);
        } else if (newStatus === 'REVOKED') {
          showToast(`Access revoked for "${title}". Hidden from homepage listings and moved under "REVOKED".`);
        } else if (newStatus === 'DRAFT') {
          showToast(`Listing "${title}" set to Draft.`);
        } else {
          showToast(`Listing "${title}" marked as ${newStatus}`);
        }
      }
      loadAdminData();
    } catch (err) {
      if (showToast) showToast('Status update failed: ' + err.message, 'error');
    }
  };

  const handleDeleteListing = async (id, title) => {
    const ok = confirmAction
      ? await confirmAction(`Permanently delete listing "${title}" from the system?`, { title: 'Delete Listing' })
      : window.confirm(`Permanently delete listing "${title}"?`);
    if (!ok) return;

    try {
      await api.deleteListing(id);
      if (showToast) showToast(`Listing "${title}" removed successfully`);
      loadAdminData();
    } catch (err) {
      if (showToast) showToast('Failed to delete listing: ' + err.message, 'error');
    }
  };

  const handleOpenCreateListing = () => {
    setEditingListingData({
      id: null,
      title: '',
      description: '',
      propertyType: 'Luxury Suite',
      price: '',
      sizeSqft: 1200,
      bedrooms: 2,
      bathrooms: 2,
      address: '',
      city: 'Colombo',
      district: 'Colombo 03',
      amenities: '24/7 Security, Swimming Pool, Fitness Center, Reserved Parking, Ocean View Balcony',
      imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      status: 'AVAILABLE',
      sellerId: '',
      agentId: ''
    });
    setEditListingModalOpen(true);
  };

  const handleAdminListingImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      if (showToast) showToast('Image file size must be less than 12MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setEditingListingData(prev => ({
        ...prev,
        imageUrl: event.target.result
      }));
      if (showToast) showToast(`Attached image: ${file.name}`);
    };
    reader.onerror = () => {
      if (showToast) showToast('Failed to read image file', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleOpenEditListing = (listing) => {
    setEditingListingData({
      id: listing.id,
      title: listing.title || '',
      description: listing.description || '',
      propertyType: listing.propertyType || 'Luxury Suite',
      price: listing.price || 0,
      sizeSqft: listing.sizeSqft || 0,
      bedrooms: listing.bedrooms || 1,
      bathrooms: listing.bathrooms || 1,
      address: listing.address || '',
      city: listing.city || '',
      district: listing.district || '',
      amenities: listing.amenities || '',
      imageUrl: listing.imageUrl || '',
      status: listing.status || 'AVAILABLE',
      sellerId: listing.seller?.id || '',
      agentId: listing.agent?.id || ''
    });
    setEditListingModalOpen(true);
  };

  const handleSaveListingEdit = async (e) => {
    e.preventDefault();
    if (!editingListingData) return;
    try {
      const payload = {
        ...editingListingData,
        price: parseFloat(editingListingData.price) || 0,
        sizeSqft: parseFloat(editingListingData.sizeSqft) || 500,
        bedrooms: parseInt(editingListingData.bedrooms) || 1,
        bathrooms: parseInt(editingListingData.bathrooms) || 1,
        sellerId: editingListingData.sellerId ? Number(editingListingData.sellerId) : null,
        agentId: editingListingData.agentId ? Number(editingListingData.agentId) : null,
        status: editingListingData.status || 'AVAILABLE'
      };
      if (editingListingData.id) {
        await api.updateListing(editingListingData.id, payload);
        if (showToast) showToast(`Listing "${editingListingData.title}" updated successfully!`);
      } else {
        await api.createListing(payload);
        if (showToast) showToast(`Apartment "${editingListingData.title}" added directly to website (Live)!`);
      }
      setEditListingModalOpen(false);
      setEditingListingData(null);
      loadAdminData();
    } catch (err) {
      if (showToast) showToast('Failed to save listing: ' + err.message, 'error');
    }
  };

  // --- USER ROLE MANAGEMENT ---
  const handleUpdateUserRole = async (userId, userEmail, newRole) => {
    try {
      await api.updateUserRole(userId, newRole);
      if (showToast) showToast(`Updated role for ${userEmail} to ${newRole}`);
      loadAdminData();
    } catch (err) {
      if (showToast) showToast('Failed to update role: ' + err.message, 'error');
    }
  };

  const handleDeleteUser = async (userId, userEmail, isMainAdminOrSelf = false) => {
    const isSelf = isMainAdminOrSelf ||
                   currentUser?.id === userId ||
                   userEmail?.toLowerCase() === 'admin@gmail.com' ||
                   (currentUser?.email && userEmail && currentUser.email.toLowerCase() === userEmail.toLowerCase());

    if (isSelf) {
      setSelfDeleteErrorModal(true);
      if (showToast) {
        showToast('Action Prohibited: The Main Administrator cannot delete their own account!', 'error');
      }
      return;
    }

    const ok = confirmAction
      ? await confirmAction(`Permanently delete user account "${userEmail}"? All associated data will be removed.`, { title: 'Delete User Account' })
      : window.confirm(`Permanently delete user account "${userEmail}"?`);
    if (!ok) return;

    try {
      await api.deleteUser(userId);
      if (showToast) showToast(`User "${userEmail}" deleted`);
      loadAdminData();
    } catch (err) {
      if (showToast) showToast('Failed to delete user: ' + err.message, 'error');
    }
  };

  // --- BUYER VIEWINGS & APPOINTMENTS CRUD ---
  const handleOpenEditViewing = (appt) => {
    setEditingViewing(appt);
    setViewingForm({
      listingId: appt.listing?.id,
      appointmentDate: appt.appointmentDate || '',
      appointmentTime: appt.appointmentTime || '10:00 AM - 11:00 AM',
      status: appt.status || 'REQUESTED',
      agentId: appt.agent?.id ? String(appt.agent.id) : '',
      notes: appt.notes || ''
    });
    setViewingModalOpen(true);
  };

  const handleSaveViewing = async (e) => {
    e.preventDefault();
    if (!editingViewing) return;

    try {
      const payload = {
        listingId: viewingForm.listingId || editingViewing.listing?.id,
        appointmentDate: viewingForm.appointmentDate,
        appointmentTime: viewingForm.appointmentTime,
        status: viewingForm.status,
        notes: viewingForm.notes,
        agentId: viewingForm.agentId ? Number(viewingForm.agentId) : null
      };
      await api.updateAppointment(editingViewing.id, payload);
      if (showToast) showToast(`Viewing appointment #${editingViewing.id} updated successfully!`);
      setViewingModalOpen(false);
      setEditingViewing(null);
      loadAdminData();
    } catch (err) {
      if (showToast) showToast('Failed to update viewing: ' + err.message, 'error');
    }
  };

  const handleQuickUpdateViewingStatus = async (appt, newStatus) => {
    try {
      const payload = {
        listingId: appt.listing?.id,
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
        status: newStatus,
        notes: appt.notes,
        agentId: appt.agent?.id || null
      };
      await api.updateAppointment(appt.id, payload);
      if (showToast) showToast(`Appointment #${appt.id} status changed to ${newStatus}`);
      loadAdminData();
    } catch (err) {
      if (showToast) showToast('Failed to update viewing status: ' + err.message, 'error');
    }
  };

  const handleDeleteViewing = async (appt) => {
    const ok = confirmAction
      ? await confirmAction(`Cancel and remove viewing appointment #${appt.id} for "${appt.listing?.title}"?`, { title: 'Delete Appointment' })
      : window.confirm(`Cancel viewing appointment #${appt.id}?`);
    if (!ok) return;

    try {
      await api.deleteAppointment(appt.id);
      if (showToast) showToast(`Viewing appointment #${appt.id} removed successfully`);
      loadAdminData();
    } catch (err) {
      if (showToast) showToast('Failed to delete appointment: ' + err.message, 'error');
    }
  };

  // --- ANNOUNCEMENTS CRUD ---
  const handleOpenCreateAnn = () => {
    setEditingAnnId(null);
    setAnnForm({ title: '', content: '', targetRole: 'ALL', priority: 'INFO', active: true });
    setAnnModalOpen(true);
  };

  const handleOpenEditAnn = (ann) => {
    setEditingAnnId(ann.id);
    setAnnForm({
      title: ann.title,
      content: ann.content,
      targetRole: ann.targetRole || 'ALL',
      priority: ann.priority || 'INFO',
      active: ann.active
    });
    setAnnModalOpen(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    try {
      if (editingAnnId) {
        await api.updateAnnouncement(editingAnnId, annForm);
        if (showToast) showToast('Announcement updated successfully!');
      } else {
        await api.createAnnouncement(annForm);
        if (showToast) showToast('New announcement broadcasted!');
      }
      setAnnModalOpen(false);
      loadAdminData();
      if (onAnnouncementChange) onAnnouncementChange();
    } catch (err) {
      if (showToast) showToast('Operation failed: ' + err.message, 'error');
    }
  };

  const handleDeleteAnnouncement = async (id, title) => {
    const ok = confirmAction
      ? await confirmAction(`Are you sure you want to delete announcement "${title}"?`, { title: 'Delete announcement' })
      : window.confirm(`Are you sure you want to delete announcement "${title}"?`);
    if (!ok) return;
    try {
      await api.deleteAnnouncement(id);
      if (showToast) showToast('Announcement removed');
      loadAdminData();
      if (onAnnouncementChange) onAnnouncementChange();
    } catch (err) {
      if (showToast) showToast('Delete failed: ' + err.message, 'error');
    }
  };

  const handleOpenAdminReplyTicket = (ticket) => {
    setActiveAdminTicket(ticket);
    setAdminReplyText(ticket.staffResponse || '');
    setAdminTicketStatus(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'RESOLVED' : 'IN_PROGRESS');
    setTicketReplyModalOpen(true);
  };

  const handleSaveAdminTicketReply = async (e) => {
    e.preventDefault();
    if (activeAdminTicket?.status === 'RESOLVED' || activeAdminTicket?.status === 'CLOSED') {
      if (showToast) showToast('No one can edit inquiries after completion.', 'error');
      return;
    }
    if ((adminTicketStatus === 'RESOLVED' || adminTicketStatus === 'CLOSED') && !adminReplyText.trim()) {
      if (showToast) showToast('An administrative resolution comment is mandatory to resolve or close a support ticket.', 'error');
      return;
    }
    try {
      await api.updateTicket(activeAdminTicket.id, {
        staffResponse: adminReplyText.trim(),
        status: adminTicketStatus
      });
      if (showToast) showToast(`Official resolution dispatched for Ticket #${activeAdminTicket.id}!`);
      setTicketReplyModalOpen(false);
      loadAdminData();
    } catch (err) {
      if (showToast) showToast('Failed to update ticket: ' + err.message, 'error');
    }
  };

  const handleDeleteAdminTicket = async (id) => {
    if (currentUser?.role === 'AGENT') {
      if (showToast) showToast('Agents are not authorized to delete inquiries.', 'error');
      return;
    }
    const targetTicket = inquiryTickets.find(t => t.id === id);
    if (targetTicket && (targetTicket.status === 'RESOLVED' || targetTicket.status === 'CLOSED')) {
      if (showToast) showToast('Inquiries cannot be deleted after completion.', 'error');
      return;
    }
    const ok = confirmAction
      ? await confirmAction(`Delete customer inquiry ticket #${id}?`, { title: 'Delete Ticket' })
      : window.confirm(`Delete customer inquiry ticket #${id}?`);
    if (!ok) return;
    try {
      await api.deleteTicket(id);
      if (showToast) showToast(`Ticket #${id} removed`);
      loadAdminData();
    } catch (err) {
      if (showToast) showToast('Failed to delete ticket: ' + err.message, 'error');
    }
  };

  // Filtered lists
  const listingCounts = useMemo(() => {
    let draft = 0;
    let available = 0;
    let revoked = 0;
    let reserved = 0;
    let sold = 0;
    allListings.forEach(l => {
      if (l.status === 'DRAFT' || l.status === 'PENDING_APPROVAL') draft++;
      else if (l.status === 'AVAILABLE') available++;
      else if (l.status === 'REVOKED') revoked++;
      else if (l.status === 'RESERVED') reserved++;
      else if (l.status === 'SOLD') sold++;
    });
    return { DRAFT: draft, AVAILABLE: available, REVOKED: revoked, RESERVED: reserved, SOLD: sold };
  }, [allListings]);

  const filteredListings = useMemo(() => {
    const nonArchived = allListings.filter(l => l.status !== 'ARCHIVED');
    if (listingFilter === 'DRAFT') {
      return nonArchived.filter(l => l.status === 'DRAFT' || l.status === 'PENDING_APPROVAL');
    }
    if (listingFilter === 'AVAILABLE') {
      return nonArchived.filter(l => l.status === 'AVAILABLE');
    }
    if (listingFilter === 'REVOKED') {
      return nonArchived.filter(l => l.status === 'REVOKED');
    }
    if (listingFilter === 'RESERVED') {
      return nonArchived.filter(l => l.status === 'RESERVED');
    }
    if (listingFilter === 'SOLD') {
      return nonArchived.filter(l => l.status === 'SOLD');
    }
    return nonArchived;
  }, [allListings, listingFilter]);

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter(u =>
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  }, [allUsers, userSearch]);

  const filteredAppointments = useMemo(() => {
    return allAppointments.filter(a => {
      const matchesStatus = viewingStatusFilter === 'ALL' || a.status === viewingStatusFilter;
      const q = viewingSearch.toLowerCase();
      const matchesQuery = !q ||
        (a.buyer?.fullName && a.buyer.fullName.toLowerCase().includes(q)) ||
        (a.buyer?.email && a.buyer.email.toLowerCase().includes(q)) ||
        (a.listing?.title && a.listing.title.toLowerCase().includes(q)) ||
        (a.listing?.city && a.listing.city.toLowerCase().includes(q)) ||
        (a.agent?.fullName && a.agent.fullName.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q));
      return matchesStatus && matchesQuery;
    });
  }, [allAppointments, viewingStatusFilter, viewingSearch]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const q = auditSearch.toLowerCase();
      const matchesQuery = !q ||
        (log.details && log.details.toLowerCase().includes(q)) ||
        ((log.performedBy || log.actorEmail) && (log.performedBy || log.actorEmail).toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        ((log.entityName || log.module) && (log.entityName || log.module).toLowerCase().includes(q));
      return matchesQuery;
    });
  }, [auditLogs, auditSearch]);

  const inventoryTypeCounts = useMemo(() => {
    let luxury = 0;
    let penthouse = 0;
    let standard = 0;
    allListings.forEach((l) => {
      const type = (l.propertyType || '').toLowerCase();
      if (type.includes('luxury')) luxury++;
      else if (type.includes('penthouse')) penthouse++;
      else if (type.includes('standard')) standard++;
      else standard++;
    });
    return { luxury, penthouse, standard };
  }, [allListings]);

  const userRoleCounts = useMemo(() => {
    let buyers = 0;
    let sellers = 0;
    let agents = 0;
    let financeAdmins = 0;
    let supportAdmins = 0;
    let admins = 0;
    allUsers.forEach((u) => {
      const role = (u.role || '').toUpperCase();
      if (role === 'BUYER') buyers++;
      else if (role === 'SELLER') sellers++;
      else if (role === 'AGENT') agents++;
      else if (role === 'FINANCE_ADMIN') financeAdmins++;
      else if (role === 'SUPPORT_ADMIN') supportAdmins++;
      else if (role === 'ADMIN') admins++;
    });
    return { buyers, sellers, agents, financeAdmins, supportAdmins, admins };
  }, [allUsers]);

  const valuationMetrics = useMemo(() => {
    let max = 0;
    let sum = 0;
    let availSum = 0;
    allListings.forEach(l => {
      const p = Number(l.price) || 0;
      if (p > max) max = p;
      sum += p;
      if (l.status === 'AVAILABLE') availSum += p;
    });
    const avg = allListings.length > 0 ? sum / allListings.length : 0;
    return {
      max: (max / 1000000).toFixed(1) + 'M',
      avg: (avg / 1000000).toFixed(1) + 'M',
      avail: (availSum / 1000000).toFixed(1) + 'M'
    };
  }, [allListings]);

  const settlementCounts = useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    let cancelled = 0;
    allReservations.forEach(r => {
      const s = (r.status || '').toUpperCase();
      if (s === 'CONFIRMED' || s === 'COMPLETED') confirmed++;
      else if (s === 'PAYMENT_PENDING' || s === 'PENDING') pending++;
      else if (s === 'CANCELLED') cancelled++;
    });
    return { confirmed, pending, cancelled };
  }, [allReservations]);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px' }}>


      {/* ============================================================ */}
      {/* 1. OVERVIEW & KPIS TAB */}
      {/* ============================================================ */}
      {adminTab === 'overview' && (
        <div>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.8rem', color: '#0f172a', margin: '0 0 6px' }}>Executive Overview & Live Platform Metrics</h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
              Real-time portfolio valuation, transaction velocity, user adoption, and active inventory status.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            {/* 1. Active Inventory Card */}
            <div className="clean-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Inventory</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building size={18} color="#2563eb" />
                </div>
              </div>
              <h3 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
                {metrics?.totalListings ?? allListings.length}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600, marginTop: '4px', marginBottom: 0 }}>
                {allListings.filter(l => l.status === 'AVAILABLE').length} Available for Purchase
              </p>

              {/* Breakdown by Inventory Type */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
                    Luxury Suite
                  </span>
                  <span style={{ fontWeight: 700, color: '#1e40af', background: '#eff6ff', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                    {inventoryTypeCounts.luxury}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7c3aed' }}></span>
                    Penthouse
                  </span>
                  <span style={{ fontWeight: 700, color: '#6d28d9', background: '#f5f3ff', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                    {inventoryTypeCounts.penthouse}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0d9488' }}></span>
                    Standard Apartment
                  </span>
                  <span style={{ fontWeight: 700, color: '#0f766e', background: '#f0fdfa', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                    {inventoryTypeCounts.standard}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Portfolio Valuation Card */}
            <div className="clean-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Portfolio Valuation</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={18} color="#d97706" />
                </div>
              </div>
              <h3 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
                LKR {metrics?.totalInventoryValue ? (metrics.totalInventoryValue / 1000000).toFixed(1) + 'M' : '320M'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
                Total Asset Book Value
              </p>

              {/* Additional Valuation Metrics */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706' }}></span>
                    Highest Unit
                  </span>
                  <span style={{ fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                    LKR {valuationMetrics.max}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                    Avg Unit Price
                  </span>
                  <span style={{ fontWeight: 700, color: '#b45309', background: '#fef9c3', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                    LKR {valuationMetrics.avg}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    Available Value
                  </span>
                  <span style={{ fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                    LKR {valuationMetrics.avail}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Registered Users Card */}
            <div className="clean-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Registered Users</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} color="#10b981" />
                </div>
              </div>
              <h3 style={{ fontSize: '1.8rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
                {metrics?.totalUsers ?? allUsers.length}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600, marginTop: '4px', marginBottom: 0 }}>
                Buyers, Sellers & Agents
              </p>

              {/* Breakdown by User Role */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    Buyers
                  </span>
                  <span style={{ fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                    {userRoleCounts.buyers}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#d97706' }}></span>
                    Sellers
                  </span>
                  <span style={{ fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                    {userRoleCounts.sellers}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1' }}></span>
                    Agents
                  </span>
                  <span style={{ fontWeight: 700, color: '#4338ca', background: '#eef2ff', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                    {userRoleCounts.agents}
                  </span>
                </div>
                {(userRoleCounts.financeAdmins > 0 || userRoleCounts.supportAdmins > 0 || userRoleCounts.admins > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                    <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0ea5e9' }}></span>
                      Dept Admins
                    </span>
                    <span style={{ fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                      {userRoleCounts.financeAdmins + userRoleCounts.supportAdmins + userRoleCounts.admins}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Property Settlements Card */}
            <div className="clean-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Property Settlements</span>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={18} color="#7c3aed" />
                </div>
              </div>
              <h3 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
                LKR {metrics?.totalRevenue ? (metrics.totalRevenue / 1000000).toFixed(2) + 'M' : '0.00'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
                Verified Deposit Capital
              </p>

              {/* Breakdown by Pipeline Status */}
              <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                    Confirmed Settlements
                  </span>
                  <span style={{ fontWeight: 700, color: '#047857', background: '#ecfdf5', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                    {settlementCounts.confirmed}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></span>
                    Pending Approval
                  </span>
                  <span style={{ fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                    {settlementCounts.pending}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></span>
                    Cancelled / Closed
                  </span>
                  <span style={{ fontWeight: 700, color: '#b91c1c', background: '#fef2f2', padding: '1px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                    {settlementCounts.cancelled}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Executive Overview: Completed Real Estate Sales & Purchase History Ledger */}
          {!isSupportAdmin && (
            <div className="clean-card" style={{ padding: '26px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800 }}>
                    <Award size={20} color="#15803d" /> Completed Real Estate Sales & Purchase History Ledger
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.86rem', margin: 0 }}>
                    Verified acquisitions with full financial settlements. These residences are marked SOLD and removed from public home discovery.
                  </p>
                </div>

                {isFinanceAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      _setAdminTab('viewings');
                      setTourFinanceSubTab('reservations');
                      setReservationStatusFilter('PURCHASE_HISTORY');
                    }}
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}
                  >
                    View Full Finance Ledger &rarr;
                  </button>
                )}
              </div>

              {/* List or Table of Sold / Completed Purchases */}
              {allReservations.filter(r => ['COMPLETED', 'SETTLED'].includes(r.status) || (r.status === 'CONFIRMED' && (r.pricingStrategy === 'FULL_CASH' || (r.pricingPlan && r.pricingPlan.toLowerCase().includes('full')) || (r.offerAmount > 0 && r.depositAmount >= r.offerAmount) || r.listing?.status === 'SOLD')) || (r.listing?.status === 'SOLD' && !['CANCELLED', 'DECLINED'].includes(r.status))).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px', color: '#64748b', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <Award size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                  <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>No Completed Sales Records Yet</div>
                  <div style={{ fontSize: '0.82rem' }}>When full cash settlements or completed purchases are approved, title deed archives will appear here.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <table className="clean-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                    <thead>
                      <tr style={{ background: '#0f294a', color: '#ffffff', textAlign: 'left', fontSize: '0.74rem', textTransform: 'uppercase' }}>
                        <th style={{ padding: '12px 14px', background: '#0f294a', color: '#ffffff' }}>Invoice / Deed #</th>
                        <th style={{ padding: '12px 14px', background: '#0f294a', color: '#ffffff' }}>Sold Property</th>
                        <th style={{ padding: '12px 14px', background: '#0f294a', color: '#ffffff' }}>Buyer (Owner)</th>
                        <th style={{ padding: '12px 14px', background: '#0f294a', color: '#ffffff' }}>Settled Price</th>
                        <th style={{ padding: '12px 14px', background: '#0f294a', color: '#ffffff' }}>Completion Date</th>
                        <th style={{ padding: '12px 14px', background: '#0f294a', color: '#ffffff' }}>Status</th>
                        <th style={{ padding: '12px 14px', background: '#0f294a', color: '#ffffff', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allReservations
                        .filter(r => ['COMPLETED', 'SETTLED'].includes(r.status) || (r.status === 'CONFIRMED' && (r.pricingStrategy === 'FULL_CASH' || (r.pricingPlan && r.pricingPlan.toLowerCase().includes('full')) || (r.offerAmount > 0 && r.depositAmount >= r.offerAmount) || r.listing?.status === 'SOLD')) || (r.listing?.status === 'SOLD' && !['CANCELLED', 'DECLINED'].includes(r.status)))
                        .slice(0, 5)
                        .map((txn) => {
                          const inv = txn.invoiceNumber || txn.invoiceNo || `INV-${txn.id}`;
                          const date = txn.paymentDate || txn.updatedAt || txn.reservationDate || txn.createdAt;
                          return (
                            <tr key={txn.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 14px', fontWeight: 800, color: '#0f294a' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Award size={13} color="#15803d" />
                                  {inv}
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{txn.listing?.title || 'Luxury Residence'}</div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{txn.listing?.city} • {txn.listing?.propertyType || 'Apartment'}</div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{txn.buyer?.fullName || 'Private Client'}</div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{txn.buyer?.email}</div>
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 700, color: '#15803d' }}>
                                LKR {(txn.offerAmount || txn.depositAmount || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.78rem' }}>
                                {date ? new Date(date).toLocaleDateString() : 'Settled'}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '3px 8px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 800 }}>
                                  <CheckCircle2 size={11} /> 🏆 SOLD / TRANSFERRED
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                                <button
                                  type="button"
                                  onClick={() => handleViewAdminInvoice(txn)}
                                  className="btn-secondary"
                                  style={{ padding: '5px 10px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: '#15803d', color: '#15803d', fontWeight: 700 }}
                                >
                                  <FileText size={12} /> Deed Invoice
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. LISTING APPROVAL & MODERATION TAB */}
      {/* ============================================================ */}
      {adminTab === 'listings' && isSuperAdmin && (
        <div className="clean-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={20} color="#0f294a" /> Property Listing Moderation & Approval
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.86rem', margin: 0 }}>
                Review, approve, suspend, or permanently remove apartment listings across all developers.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleOpenCreateListing}
                className="btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 15px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  backgroundColor: '#059669',
                  borderColor: '#059669',
                  color: '#ffffff',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)'
                }}
                title="Publish a luxury apartment directly into the website (automatically Available on the homepage without third-party permission)"
              >
                <Plus size={15} /> Add Apartment (Direct Live)
              </button>

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { id: 'AVAILABLE', label: 'AVAILABLE (LIVE)', hint: 'Access granted by Super Admin, live on homepage listings' },
                  { id: 'DRAFT', label: 'DRAFTS (NEW)', hint: 'Added by sellers or agents, automatically draft until Super Admin grants access' },
                  { id: 'REVOKED', label: 'REVOKED', hint: 'Access revoked by Super Admin, hidden from homepage listings' },
                  { id: 'RESERVED', label: 'RESERVED', hint: 'Reserved by buyers' },
                  { id: 'SOLD', label: 'SOLD', hint: 'Total purchase completed' }
                ].map(({ id, label, hint }) => (
                  <button
                    key={id}
                    onClick={() => setListingFilter(id)}
                    title={hint}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      background: listingFilter === id ? '#0f294a' : '#f1f5f9',
                      color: listingFilter === id ? '#ffffff' : '#475569',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{label}</span>
                    <span style={{
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '0.70rem',
                      background: id === 'DRAFT' && listingCounts.DRAFT > 0
                        ? '#d97706'
                        : id === 'REVOKED' && listingCounts.REVOKED > 0
                        ? '#ef4444'
                        : (listingFilter === id ? 'rgba(255,255,255,0.2)' : '#e2e8f0'),
                      color: (id === 'DRAFT' && listingCounts.DRAFT > 0) || (id === 'REVOKED' && listingCounts.REVOKED > 0) || listingFilter === id
                        ? '#ffffff'
                        : '#334155',
                      fontWeight: 800
                    }}>
                      {listingCounts[id] || 0}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Residence Details</th>
                  <th>Location</th>
                  <th>Price (LKR)</th>
                  <th>Specs</th>
                  <th>Current Status</th>
                  <th style={{ textAlign: 'right' }}>Super Admin Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                      <Building size={32} color="#94a3b8" style={{ marginBottom: '8px', display: 'inline-block' }} />
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                        No apartments found in {listingFilter} tab
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                        {listingFilter === 'DRAFT' && 'New apartment listings added by sellers or agents automatically start in Draft awaiting Super Admin grant access.'}
                        {listingFilter === 'AVAILABLE' && 'Apartments that have been granted access by Super Admin and are live on homepage listings.'}
                        {listingFilter === 'REVOKED' && 'Apartments where access has been revoked by Super Admin. Nothing appears on homepage listings.'}
                        {listingFilter === 'RESERVED' && 'Apartments with active buyer reservations waiting for full payment.'}
                        {listingFilter === 'SOLD' && 'Apartments where total purchase / full payment has been completed.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredListings.map((listing) => {
                    const activeRes = allReservations.find(r => r.listing?.id === listing.id && ['OFFER_SUBMITTED', 'RESERVED', 'PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'CONFIRMED'].includes(r.status));
                    const soldRes = allReservations.find(r => r.listing?.id === listing.id && (r.status === 'COMPLETED' || (r.status === 'CONFIRMED' && r.pricingPlan === 'FULL_CASH')));

                    return (
                      <tr key={listing.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img
                              src={listing.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=150&q=80'}
                              alt={listing.title}
                              style={{ width: '50px', height: '40px', objectFit: 'cover', borderRadius: '6px' }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{listing.title}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {listing.propertyType} • ID #{listing.id}
                                {listing.agent && listing.seller && listing.agent.id === listing.seller.id
                                  ? ` • Agent: ${listing.agent.fullName}`
                                  : (
                                    <>
                                      {listing.seller?.fullName && ` • Seller: ${listing.seller.fullName}`}
                                      {listing.agent?.fullName && ` • Agent: ${listing.agent.fullName}`}
                                    </>
                                  )}
                              </div>
                              {activeRes && (
                                <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                                  Reserved by: {activeRes.buyer?.fullName || activeRes.buyer?.email || 'Client'} ({activeRes.pricingPlan || 'Standard'})
                                </div>
                              )}
                              {soldRes && (
                                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                                  Sold to: {soldRes.buyer?.fullName || soldRes.buyer?.email || 'Client'}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{listing.city}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{listing.district}</div>
                        </td>
                        <td style={{ fontWeight: 800, color: '#0f294a' }}>
                          LKR {listing.price?.toLocaleString()}
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#475569' }}>
                          {listing.bedrooms} Beds • {listing.bathrooms} Baths • {listing.sizeSqft} sq.ft
                        </td>
                        <td>
                          {listing.status === 'DRAFT' || listing.status === 'PENDING_APPROVAL' ? (
                            <span className="badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={11} /> Draft (Pending Access)
                            </span>
                          ) : listing.status === 'AVAILABLE' ? (
                            <span className="badge" style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={11} /> Access Granted (Live)
                            </span>
                          ) : listing.status === 'REVOKED' ? (
                            <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <XCircle size={11} /> Revoked
                            </span>
                          ) : (
                            <span className={`badge badge-${listing.status ? listing.status.toLowerCase() : 'available'}`}>
                              {listing.status}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                            {listing.status !== 'RESERVED' && listing.status !== 'SOLD' && listingFilter !== 'RESERVED' && listingFilter !== 'SOLD' && (
                              <>
                                {(listing.status === 'DRAFT' || listing.status === 'PENDING_APPROVAL' || listing.status === 'REVOKED') && (
                                  <button
                                    onClick={() => handleUpdateListingStatus(listing.id, listing.title, 'AVAILABLE')}
                                    className="btn-secondary"
                                    style={{ padding: '5px 12px', fontSize: '0.76rem', color: '#15803d', borderColor: '#86efac', background: '#f0fdf4', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="Grant access: Make visible on homepage listings and seller/agent page"
                                  >
                                    <CheckCircle2 size={13} /> Grant Access
                                  </button>
                                )}
                                {(listing.status === 'DRAFT' || listing.status === 'PENDING_APPROVAL' || listing.status === 'AVAILABLE') && (
                                  <button
                                    onClick={() => handleUpdateListingStatus(listing.id, listing.title, 'REVOKED')}
                                    className="btn-secondary"
                                    style={{ padding: '5px 10px', fontSize: '0.76rem', color: '#b91c1c', borderColor: '#fca5a5', background: '#fef2f2', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="Revoke access: Removes from homepage listings and marks as Revoked on seller/agent page"
                                  >
                                    <XCircle size={13} /> Revoke
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteListing(listing.id, listing.title)}
                              className="btn-danger"
                              style={{ padding: '5px 9px', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Permanently delete listing from system"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* 2.5 FINANCE DEPARTMENT RESERVATIONS & VIEWING TOURS TAB */}
      {/* ============================================================ */}
      {adminTab === 'viewings' && isFinanceAdmin && (
        <div>
          {/* Header & Subtitle */}
          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '1.65rem', color: '#0f172a', margin: '0 0 6px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <DollarSign size={26} color="#0284c7" /> Finance Department — Reservations & Viewing Tour Management
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
              Centralized administrative management for Finance Department property purchase reservations, settlement processing, payment clearance, and scheduled buyer apartment inspection tours.
            </p>
          </div>

          {/* Sub-Tab Navigation Bar */}
          <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px', paddingBottom: '2px' }}>
            <button
              type="button"
              onClick={() => setTourFinanceSubTab('reservations')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                color: tourFinanceSubTab === 'reservations' ? '#0f294a' : '#64748b',
                borderBottom: tourFinanceSubTab === 'reservations' ? '3px solid #0f294a' : '3px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.15s'
              }}
            >
              <CreditCard size={17} color={tourFinanceSubTab === 'reservations' ? '#0f294a' : '#94a3b8'} />
              Finance Reservations & Settlements
              <span style={{
                background: tourFinanceSubTab === 'reservations' ? '#e0f2fe' : '#f1f5f9',
                color: tourFinanceSubTab === 'reservations' ? '#0284c7' : '#64748b',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.74rem',
                fontWeight: 700
              }}>
                {allReservations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTourFinanceSubTab('viewings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                color: tourFinanceSubTab === 'viewings' ? '#0f294a' : '#64748b',
                borderBottom: tourFinanceSubTab === 'viewings' ? '3px solid #0f294a' : '3px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.15s'
              }}
            >
              <Calendar size={17} color={tourFinanceSubTab === 'viewings' ? '#0f294a' : '#94a3b8'} />
              Buyer Viewing Tours
              <span style={{
                background: tourFinanceSubTab === 'viewings' ? '#e0f2fe' : '#f1f5f9',
                color: tourFinanceSubTab === 'viewings' ? '#0284c7' : '#64748b',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.74rem',
                fontWeight: 700
              }}>
                {allAppointments.length}
              </span>
            </button>
          </div>

          {/* ================= SUB-TAB 1: FINANCE RESERVATIONS & SETTLEMENTS ================= */}
          {tourFinanceSubTab === 'reservations' && (
            <div>
              {/* Finance Department KPI Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                <div className="clean-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Reservations</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={16} color="#2563eb" />
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
                    {allReservations.length}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px', margin: 0 }}>Pipeline Commitments</p>
                </div>

                <div className="clean-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Settlements Confirmed</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={16} color="#10b981" />
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.6rem', color: '#15803d', fontWeight: 800, margin: 0 }}>
                    {allReservations.filter(r => ['CONFIRMED', 'PAYMENT_RECEIVED', 'SETTLED', 'COMPLETED'].includes(r.status)).length}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#15803d', marginTop: '4px', margin: 0, fontWeight: 600 }}>Payment Verified / Active</p>
                </div>

                <div className="clean-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Awaiting Deposit</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={16} color="#d97706" />
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.6rem', color: '#b45309', fontWeight: 800, margin: 0 }}>
                    {allReservations.filter(r => ['OFFER_SUBMITTED', 'PENDING', 'DEPOSIT_PENDING'].includes(r.status)).length}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#d97706', marginTop: '4px', margin: 0, fontWeight: 600 }}>Awaiting Wire / Transfer</p>
                </div>

                <div className="clean-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>Total Settlement Volume</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DollarSign size={16} color="#7c3aed" />
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.35rem', color: '#6b21a8', fontWeight: 800, margin: 0 }}>
                    LKR {(allReservations.reduce((sum, r) => sum + (r.depositAmount || 0), 0)).toLocaleString()}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#6b21a8', marginTop: '4px', margin: 0, fontWeight: 600 }}>Total Deposits Registered</p>
                </div>
              </div>

              {/* Finance Reservations Table Card */}
              <div className="clean-card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
                  {/* Status Filter Pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['ALL', 'PURCHASE_HISTORY', 'CONFIRMED', 'PAYMENT_PENDING', 'AWAITING_DEPOSIT', 'CANCELLED'].map((status) => {
                      const isPurchaseHistory = (r) => {
                        if (['COMPLETED', 'SETTLED'].includes(r.status)) return true;
                        if (r.status === 'CONFIRMED' && (
                          r.pricingStrategy === 'FULL_CASH' ||
                          (r.pricingPlan && r.pricingPlan.toLowerCase().includes('full')) ||
                          (r.offerAmount > 0 && r.depositAmount >= r.offerAmount) ||
                          r.listing?.status === 'SOLD'
                        )) return true;
                        if (r.listing?.status === 'SOLD' && !['CANCELLED', 'DECLINED'].includes(r.status)) return true;
                        return false;
                      };

                      const count = status === 'ALL'
                        ? allReservations.length
                        : status === 'PURCHASE_HISTORY'
                          ? allReservations.filter(isPurchaseHistory).length
                          : status === 'CONFIRMED'
                            ? allReservations.filter(r => ['CONFIRMED', 'COMPLETED', 'SETTLED'].includes(r.status) && !isPurchaseHistory(r)).length
                            : status === 'PAYMENT_PENDING'
                              ? allReservations.filter(r => ['PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'DEPOSIT_PAID'].includes(r.status)).length
                              : status === 'AWAITING_DEPOSIT'
                                ? allReservations.filter(r => ['OFFER_SUBMITTED', 'RESERVED', 'PENDING', 'DEPOSIT_PENDING'].includes(r.status)).length
                                : allReservations.filter(r => ['CANCELLED', 'DECLINED'].includes(r.status)).length;

                      const label = status === 'PURCHASE_HISTORY'
                        ? '🏆 Sold / Purchase History'
                        : status === 'CONFIRMED'
                          ? 'Confirmed Reservations'
                          : status === 'PAYMENT_PENDING'
                            ? 'Pending Approval'
                            : status === 'AWAITING_DEPOSIT'
                              ? 'Awaiting Deposit'
                              : status === 'CANCELLED'
                                ? 'Cancelled'
                                : 'All Records';

                      return (
                        <button
                          key={status}
                          onClick={() => setReservationStatusFilter(status)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            background: reservationStatusFilter === status ? '#0f294a' : (status === 'PURCHASE_HISTORY' ? '#f0fdf4' : '#f1f5f9'),
                            color: reservationStatusFilter === status ? '#ffffff' : (status === 'PURCHASE_HISTORY' ? '#15803d' : '#475569'),
                            border: status === 'PURCHASE_HISTORY' && reservationStatusFilter !== status ? '1px solid #bbf7d0' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          {status === 'PURCHASE_HISTORY' && <Award size={13} />}
                          {label}
                          <span style={{ marginLeft: '4px', opacity: 0.8, fontSize: '0.72rem' }}>
                            ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search Bar */}
                  <div style={{ position: 'relative', minWidth: '280px' }}>
                    <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search buyer, property, invoice #..."
                      value={reservationSearch}
                      onChange={(e) => setReservationSearch(e.target.value)}
                      style={{
                        padding: '8px 12px 8px 36px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.84rem',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Optional Purchase History Dedicated Alert */}
                {reservationStatusFilter === 'PURCHASE_HISTORY' && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 18px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Award size={22} color="#15803d" />
                      <div>
                        <div style={{ fontWeight: 800, color: '#14532d', fontSize: '0.88rem' }}>
                          Verified Real Estate Purchase & Sales History Ledger
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#15803d' }}>
                          These properties are 100% fully sold and legally transferred to buyers. They are automatically hidden from the home apartment search catalog.
                        </div>
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: '#15803d', fontSize: '0.88rem' }}>
                      Archived Deeds: {allReservations.filter(r => ['COMPLETED', 'SETTLED'].includes(r.status) || (r.status === 'CONFIRMED' && (r.pricingStrategy === 'FULL_CASH' || (r.pricingPlan && r.pricingPlan.toLowerCase().includes('full')) || (r.offerAmount > 0 && r.depositAmount >= r.offerAmount) || r.listing?.status === 'SOLD')) || (r.listing?.status === 'SOLD' && !['CANCELLED', 'DECLINED'].includes(r.status))).length} Units
                    </div>
                  </div>
                )}

                {/* Reservations Table */}
                <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: '#0f294a', borderBottom: '2px solid #d97706', textAlign: 'left', color: '#ffffff', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <th style={{ padding: '14px 14px', background: '#0f294a', color: '#ffffff', fontWeight: 700 }}>Invoice / ID</th>
                        <th style={{ padding: '14px 14px', background: '#0f294a', color: '#ffffff', fontWeight: 700 }}>Property Apartment</th>
                        <th style={{ padding: '14px 14px', background: '#0f294a', color: '#ffffff', fontWeight: 700 }}>Buyer Purchaser</th>
                        <th style={{ padding: '14px 14px', background: '#0f294a', color: '#ffffff', fontWeight: 700 }}>Price, Deposit & Remaining</th>
                        <th style={{ padding: '14px 14px', background: '#0f294a', color: '#ffffff', fontWeight: 700 }}>Reservation Date</th>
                        <th style={{ padding: '14px 14px', background: '#0f294a', color: '#ffffff', fontWeight: 700 }}>Finance Clearance</th>
                        <th style={{ padding: '14px 14px', background: '#0f294a', color: '#ffffff', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allReservations
                        .filter(r => {
                          const isPurchaseHistory = (item) => {
                            if (['COMPLETED', 'SETTLED'].includes(item.status)) return true;
                            if (item.status === 'CONFIRMED' && (
                              item.pricingStrategy === 'FULL_CASH' ||
                              (item.pricingPlan && item.pricingPlan.toLowerCase().includes('full')) ||
                              (item.offerAmount > 0 && item.depositAmount >= item.offerAmount) ||
                              item.listing?.status === 'SOLD'
                            )) return true;
                            if (item.listing?.status === 'SOLD' && !['CANCELLED', 'DECLINED'].includes(item.status)) return true;
                            return false;
                          };

                          const matchesStatus = reservationStatusFilter === 'ALL' ||
                            (reservationStatusFilter === 'PURCHASE_HISTORY'
                              ? isPurchaseHistory(r)
                              : reservationStatusFilter === 'AWAITING_DEPOSIT'
                                ? ['OFFER_SUBMITTED', 'RESERVED', 'PENDING', 'DEPOSIT_PENDING'].includes(r.status)
                                : reservationStatusFilter === 'PAYMENT_PENDING'
                                  ? ['PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'DEPOSIT_PAID'].includes(r.status)
                                  : reservationStatusFilter === 'CONFIRMED'
                                    ? (['CONFIRMED', 'COMPLETED', 'SETTLED'].includes(r.status) && !isPurchaseHistory(r))
                                    : ['CANCELLED', 'DECLINED'].includes(r.status));
                          const inv = r.invoiceNumber || r.invoiceNo || `INV-${r.id}`;
                          const matchesSearch = !reservationSearch ||
                            inv.toLowerCase().includes(reservationSearch.toLowerCase()) ||
                            (r.listing?.title && r.listing.title.toLowerCase().includes(reservationSearch.toLowerCase())) ||
                            (r.buyer?.fullName && r.buyer.fullName.toLowerCase().includes(reservationSearch.toLowerCase())) ||
                            (r.buyer?.email && r.buyer.email.toLowerCase().includes(reservationSearch.toLowerCase()));
                          return matchesStatus && matchesSearch;
                        }).length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '40px 14px', textAlign: 'center', color: '#94a3b8' }}>
                            <FileText size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                            No records matched your current filter.
                          </td>
                        </tr>
                      ) : (
                        allReservations
                          .filter(r => {
                            const isPurchaseHistory = (item) => {
                              if (['COMPLETED', 'SETTLED'].includes(item.status)) return true;
                              if (item.status === 'CONFIRMED' && (
                                item.pricingStrategy === 'FULL_CASH' ||
                                (item.pricingPlan && item.pricingPlan.toLowerCase().includes('full')) ||
                                (item.offerAmount > 0 && item.depositAmount >= item.offerAmount) ||
                                item.listing?.status === 'SOLD'
                              )) return true;
                              if (item.listing?.status === 'SOLD' && !['CANCELLED', 'DECLINED'].includes(item.status)) return true;
                              return false;
                            };

                            const matchesStatus = reservationStatusFilter === 'ALL' ||
                              (reservationStatusFilter === 'PURCHASE_HISTORY'
                                ? isPurchaseHistory(r)
                                : reservationStatusFilter === 'AWAITING_DEPOSIT'
                                  ? ['OFFER_SUBMITTED', 'RESERVED', 'PENDING', 'DEPOSIT_PENDING'].includes(r.status)
                                  : reservationStatusFilter === 'PAYMENT_PENDING'
                                    ? ['PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'DEPOSIT_PAID'].includes(r.status)
                                    : reservationStatusFilter === 'CONFIRMED'
                                      ? (['CONFIRMED', 'COMPLETED', 'SETTLED'].includes(r.status) && !isPurchaseHistory(r))
                                      : ['CANCELLED', 'DECLINED'].includes(r.status));
                            const inv = r.invoiceNumber || r.invoiceNo || `INV-${r.id}`;
                            const matchesSearch = !reservationSearch ||
                              inv.toLowerCase().includes(reservationSearch.toLowerCase()) ||
                              (r.listing?.title && r.listing.title.toLowerCase().includes(reservationSearch.toLowerCase())) ||
                              (r.buyer?.fullName && r.buyer.fullName.toLowerCase().includes(reservationSearch.toLowerCase())) ||
                              (r.buyer?.email && r.buyer.email.toLowerCase().includes(reservationSearch.toLowerCase()));
                            return matchesStatus && matchesSearch;
                          })
                          .map(txn => {
                            const isPurchased = (['COMPLETED', 'SETTLED'].includes(txn.status)) ||
                              (txn.status === 'CONFIRMED' && (
                                txn.pricingStrategy === 'FULL_CASH' ||
                                (txn.pricingPlan && txn.pricingPlan.toLowerCase().includes('full')) ||
                                (txn.offerAmount > 0 && txn.depositAmount >= txn.offerAmount) ||
                                txn.listing?.status === 'SOLD'
                              )) ||
                              (txn.listing?.status === 'SOLD' && !['CANCELLED', 'DECLINED'].includes(txn.status));

                            const isConfirmed = ['CONFIRMED', 'COMPLETED'].includes(txn.status);
                            const isPendingPayment = ['PAYMENT_PENDING', 'PAYMENT_RECEIVED', 'DEPOSIT_PAID'].includes(txn.status);
                            const isAwaitingDeposit = ['OFFER_SUBMITTED', 'RESERVED', 'PENDING', 'DEPOSIT_PENDING'].includes(txn.status);
                            const isCancelled = ['CANCELLED', 'DECLINED'].includes(txn.status);
                            const isFullCash = txn.pricingStrategy === 'FULL_CASH' || (txn.pricingPlan && txn.pricingPlan.toLowerCase().includes('full'));
                            const remainingDue = (isPurchased || isFullCash) ? 0 : Math.max(0, (txn.offerAmount || 0) - (txn.depositAmount || 0));

                            return (
                              <tr key={txn.id} style={{ borderBottom: '1px solid #f1f5f9', background: isPurchased ? '#fcfdfd' : 'transparent' }}>
                                <td style={{ padding: '14px' }}>
                                  <div style={{ fontWeight: 800, color: '#0f294a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {isPurchased ? <Award size={14} color="#15803d" /> : <Receipt size={14} color="#0284c7" />}
                                    {txn.invoiceNumber || txn.invoiceNo || `INV-${txn.id}`}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                    Ref: #PF-RES-{txn.id}
                                  </div>
                                </td>

                                <td style={{ padding: '14px' }}>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                    {txn.listing?.title || `Listing #${txn.listingId || txn.id}`}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                    <MapPin size={11} /> {txn.listing?.city || 'Colombo'}, {txn.listing?.district || 'Western'}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600, marginTop: '2px' }}>
                                    Plan: {txn.pricingPlan || 'Standard Commitment'}
                                  </div>
                                </td>

                                <td style={{ padding: '14px' }}>
                                  <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                    {txn.buyer?.fullName || 'Private Purchaser'}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                    {txn.buyer?.email || 'N/A'}
                                  </div>
                                  {txn.buyer?.phone && (
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                      <Phone size={11} /> {txn.buyer.phone}
                                    </div>
                                  )}
                                </td>

                                <td style={{ padding: '14px' }}>
                                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                                    Total: <strong style={{ color: '#0f172a' }}>LKR {txn.offerAmount?.toLocaleString()}</strong>
                                    {isFullCash && (
                                      <span style={{ marginLeft: '6px', fontSize: '0.68rem', background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>2% Off</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.80rem', fontWeight: 700, color: (isPurchased || isConfirmed) ? '#15803d' : '#0f294a', marginTop: '3px' }}>
                                    Deposit / Paid: LKR {(isPurchased && !isFullCash && txn.offerAmount ? txn.offerAmount : txn.depositAmount)?.toLocaleString()}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', marginTop: '3px', fontWeight: 700 }}>
                                    {isPurchased || isFullCash ? (
                                      <span style={{ color: '#15803d' }}>Remaining: LKR 0 (Fully Settled)</span>
                                    ) : (
                                      <span style={{ color: '#b45309' }}>Remaining: LKR {remainingDue.toLocaleString()}</span>
                                    )}
                                  </div>
                                </td>

                                <td style={{ padding: '14px', fontSize: '0.82rem', color: '#334155' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Calendar size={13} color="#64748b" />
                                    {txn.reservationDate ? new Date(txn.reservationDate).toLocaleDateString() : 'N/A'}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                                    Payment Method: <strong style={{ color: txn.paymentMethod ? '#0f172a' : '#b45309' }}>{formatAdminPaymentMethod(txn.paymentMethod)}</strong>
                                  </div>
                                  {txn.paymentReference && (
                                    <div style={{ fontSize: '0.70rem', color: '#0284c7', fontFamily: 'monospace', marginTop: '1px' }}>
                                      Ref: {txn.paymentReference}
                                    </div>
                                  )}
                                </td>

                                <td style={{ padding: '14px' }}>
                                  <div style={{ marginBottom: isPendingPayment ? '6px' : '0' }}>
                                    <span style={{
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.74rem',
                                      fontWeight: 800,
                                      background: isPurchased ? '#dcfce7' : isConfirmed ? '#dcfce7' : isPendingPayment ? '#fef3c7' : isAwaitingDeposit ? '#fffbeb' : isCancelled ? '#fee2e2' : '#f1f5f9',
                                      color: isPurchased ? '#15803d' : isConfirmed ? '#15803d' : isPendingPayment ? '#b45309' : isAwaitingDeposit ? '#b45309' : isCancelled ? '#b91c1c' : '#475569',
                                      border: isPurchased ? '1px solid #86efac' : isPendingPayment ? '1px solid #fde68a' : isAwaitingDeposit ? '1px solid #fef3c7' : 'none',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}>
                                      {isPurchased && <CheckCircle2 size={11} />}
                                      {!isPurchased && (isPendingPayment || isAwaitingDeposit) && <Clock size={11} />}
                                      {!isPurchased && isConfirmed && <CheckCircle2 size={11} />}
                                      {isPurchased ? '🏆 Acquired & Sold' : isPendingPayment ? 'Payment Submitted & Pending Approval' : isAwaitingDeposit ? 'Awaiting Buyer Deposit' : isConfirmed ? 'Confirmed' : isCancelled ? 'Cancelled' : txn.status}
                                    </span>
                                    {isPurchased && (
                                      <div style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                                        Ownership Deed Transferred
                                      </div>
                                    )}
                                    {isCancelled && txn.refundType && (
                                      <div style={{
                                        fontSize: '0.68rem',
                                        color: txn.refundType === 'FULL_REFUND' ? '#15803d' : txn.refundType === 'PARTIAL_REFUND' ? '#b45309' : '#b91c1c',
                                        fontWeight: 700,
                                        marginTop: '3px'
                                      }}>
                                        {txn.refundType === 'FULL_REFUND' ? 'Full Refund (0% Tax)' : txn.refundType === 'PARTIAL_REFUND' ? 'Partial (-15% Tax)' : 'Non-Refundable'}
                                      </div>
                                    )}
                                  </div>

                                  {isPendingPayment && (
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleAdminConfirmPayment(txn.id, txn.invoiceNumber || txn.invoiceNo || `INV-${txn.id}`)}
                                        className="btn-primary"
                                        style={{ padding: '4px 9px', fontSize: '0.74rem', background: '#15803d', borderColor: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer' }}
                                        title="Verify & Confirm Payment"
                                      >
                                        <CheckCircle2 size={12} /> Confirm Payment
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleAdminDeclinePayment(txn.id, txn.invoiceNumber || txn.invoiceNo || `INV-${txn.id}`)}
                                        className="btn-danger"
                                        style={{ padding: '4px 9px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer' }}
                                        title="Decline Payment & Process Refund"
                                      >
                                        <X size={12} /> Decline Payment
                                      </button>
                                    </div>
                                  )}
                                </td>

                                <td style={{ padding: '14px', textAlign: 'right' }}>
                                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                                    {(isConfirmed || isCancelled) ? (
                                      <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center' }}>
                                        <button
                                          type="button"
                                          onClick={() => handleViewAdminInvoice(txn)}
                                          className="btn-secondary"
                                          style={{ padding: '5px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                          title="View Official Finance Tax Invoice / Refund Credit Note"
                                        >
                                          <FileText size={13} /> Invoice
                                        </button>
                                        {isConfirmed && txn.status !== 'COMPLETED' && (
                                          <button
                                            type="button"
                                            onClick={() => handleAdminUpdateReservationStatus(txn.id, 'COMPLETED', txn.invoiceNumber || txn.invoiceNo || `INV-${txn.id}`)}
                                            className="btn-primary"
                                            style={{ padding: '5px 8px', fontSize: '0.74rem', background: '#0f294a', borderColor: '#0f294a', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, borderRadius: '6px', cursor: 'pointer' }}
                                            title="Finalize Total Purchase (Full Payment Completed — Marks Apartment as SOLD)"
                                          >
                                            <CheckCircle2 size={12} /> Mark Sold
                                          </button>
                                        )}
                                        {isConfirmed && (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenAdminRefundModal(txn)}
                                            className="btn-danger"
                                            style={{ padding: '5px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                            title="Process Cancellation & Strategy Refund"
                                          >
                                            <Trash2 size={13} /> Refund
                                          </button>
                                        )}
                                      </div>
                                    ) : isPendingPayment ? (
                                      <span style={{ fontSize: '0.76rem', color: '#b45309', fontStyle: 'italic', fontWeight: 600 }}>
                                        Pending verification
                                      </span>
                                    ) : (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic' }}>
                                          Awaiting deposit
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleAdminCancelUnpaidReservation(txn.id, txn.invoiceNumber || txn.invoiceNo || `INV-${txn.id}`)}
                                          className="btn-danger"
                                          style={{ padding: '4px 7px' }}
                                          title="Cancel Unpaid Reservation (No Refund)"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= SUB-TAB 2: BUYER VIEWING TOURS ================= */}
          {tourFinanceSubTab === 'viewings' && (
            <div>
              {/* 4 KPI Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px', marginBottom: '28px' }}>
                <div className="clean-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Viewings</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar size={16} color="#2563eb" />
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.6rem', color: '#0f172a', fontWeight: 800, margin: 0 }}>
                    {allAppointments.length}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '4px', margin: 0 }}>All-time bookings</p>
                </div>

                <div className="clean-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Pending Review</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={16} color="#d97706" />
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.6rem', color: '#b45309', fontWeight: 800, margin: 0 }}>
                    {allAppointments.filter(a => a.status === 'REQUESTED').length}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#d97706', marginTop: '4px', margin: 0, fontWeight: 600 }}>Awaiting confirmation</p>
                </div>

                <div className="clean-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Confirmed Tours</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={16} color="#10b981" />
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.6rem', color: '#15803d', fontWeight: 800, margin: 0 }}>
                    {allAppointments.filter(a => a.status === 'CONFIRMED').length}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#15803d', marginTop: '4px', margin: 0, fontWeight: 600 }}>Scheduled on calendar</p>
                </div>

                <div className="clean-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#6b21a8', textTransform: 'uppercase' }}>Completed</span>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building size={16} color="#7c3aed" />
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1.6rem', color: '#6b21a8', fontWeight: 800, margin: 0 }}>
                    {allAppointments.filter(a => a.status === 'COMPLETED').length}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#6b21a8', marginTop: '4px', margin: 0, fontWeight: 600 }}>Successfully toured</p>
                </div>
              </div>

              {/* Viewing Table Card */}
              <div className="clean-card" style={{ padding: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['ALL', 'REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setViewingStatusFilter(status)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: viewingStatusFilter === status ? '#0f294a' : '#f1f5f9',
                          color: viewingStatusFilter === status ? '#ffffff' : '#475569',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {status}
                        {status !== 'ALL' && (
                          <span style={{ marginLeft: '6px', opacity: 0.8, fontSize: '0.72rem' }}>
                            ({allAppointments.filter(a => a.status === status).length})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div style={{ position: 'relative', minWidth: '260px' }}>
                    <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      placeholder="Search buyer, property, agent..."
                      value={viewingSearch}
                      onChange={(e) => setViewingSearch(e.target.value)}
                      style={{
                        padding: '8px 12px 8px 36px',
                        fontSize: '0.84rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="clean-table">
                    <thead>
                      <tr>
                        <th>Tour ID</th>
                        <th>Apartment Residence</th>
                        <th>Buyer Contact</th>
                        <th>Inspection Schedule</th>
                        <th>Assigned Agent</th>
                        <th>Status</th>
                        <th>Buyer Notes</th>
                        <th style={{ textAlign: 'right' }}>Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAppointments.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                            No apartment viewing appointments found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAppointments.map((appt) => {
                          const statusStyles = {
                            REQUESTED: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
                            CONFIRMED: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
                            RESCHEDULED: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
                            COMPLETED: { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' },
                            CANCELLED: { bg: '#ffe4e6', text: '#be123c', border: '#fecdd3' }
                          }[appt.status] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };

                          return (
                            <tr key={appt.id}>
                              <td>
                                <strong style={{ color: '#0f294a' }}>#{appt.id}</strong>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                  {appt.createdAt ? new Date(appt.createdAt).toLocaleDateString() : 'Recent'}
                                </div>
                              </td>

                              <td>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                                  {appt.listing?.title || 'Unknown Residence'}
                                </div>
                                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                                  {appt.listing?.city} • LKR {appt.listing?.price ? (appt.listing.price / 1000000).toFixed(1) + 'M' : '—'}
                                </div>
                              </td>

                              <td>
                                <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>
                                  {appt.buyer?.fullName || 'Anonymous Buyer'}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                                  {appt.buyer?.email}
                                </div>
                                {appt.buyer?.phone && (
                                  <div style={{ fontSize: '0.72rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Phone size={11} /> {appt.buyer.phone}
                                  </div>
                                )}
                              </td>

                              <td>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <Calendar size={13} color="#2563eb" /> {appt.appointmentDate}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  <Clock size={12} /> {appt.appointmentTime}
                                </div>
                              </td>

                              <td>
                                {appt.agent ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        background: '#ecfdf5',
                                        color: '#047857',
                                        border: '1px solid #a7f3d0',
                                        borderRadius: '12px',
                                        padding: '1px 7px'
                                      }}>
                                        <UserCheck size={11} /> Assigned Agent
                                      </span>
                                    </div>
                                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>
                                      {appt.agent.fullName}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                      {appt.agent.email}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.72rem',
                                    color: '#d97706',
                                    fontWeight: 700,
                                    background: '#fffbeb',
                                    border: '1px solid #fde68a',
                                    padding: '3px 8px',
                                    borderRadius: '6px'
                                  }}>
                                    ⏳ Open Invitation (All Agents)
                                  </span>
                                )}
                              </td>

                              <td>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: '20px',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  backgroundColor: statusStyles.bg,
                                  color: statusStyles.text,
                                  border: `1px solid ${statusStyles.border}`
                                }}>
                                  {appt.status}
                                </span>
                              </td>

                              <td style={{ maxWidth: '180px' }}>
                                <div style={{ fontSize: '0.78rem', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={appt.notes || ''}>
                                  {appt.notes || '—'}
                                </div>
                              </td>

                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                                  {/* Quick Confirm */}
                                  {appt.status === 'REQUESTED' && (
                                    <button
                                      onClick={() => handleQuickUpdateViewingStatus(appt, 'CONFIRMED')}
                                      style={{
                                        background: '#dcfce7',
                                        border: '1px solid #86efac',
                                        color: '#15803d',
                                        padding: '5px 8px',
                                        borderRadius: '6px',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                      title="Quick Confirm Appointment"
                                    >
                                      <Check size={13} /> Confirm
                                    </button>
                                  )}

                                  {/* Quick Complete */}
                                  {(appt.status === 'CONFIRMED' || appt.status === 'RESCHEDULED') && (
                                    <button
                                      onClick={() => handleQuickUpdateViewingStatus(appt, 'COMPLETED')}
                                      style={{
                                        background: '#ede9fe',
                                        border: '1px solid #c4b5fd',
                                        color: '#5b21b6',
                                        padding: '5px 8px',
                                        borderRadius: '6px',
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}
                                      title="Mark Tour as Completed"
                                    >
                                      <CheckCircle2 size={13} /> Complete
                                    </button>
                                  )}

                                  {/* Edit Viewing Details Modal Trigger */}
                                  <button
                                    onClick={() => handleOpenEditViewing(appt)}
                                    className="btn-secondary"
                                    style={{ padding: '5px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="Edit Schedule, Agent or Status"
                                  >
                                    <Edit2 size={13} /> Edit
                                  </button>

                                  {/* Delete / Cancel Button */}
                                  <button
                                    onClick={() => handleDeleteViewing(appt)}
                                    className="btn-danger"
                                    style={{ padding: '5px 8px' }}
                                    title="Cancel & Delete Appointment"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 2.8 CUSTOMER INQUIRIES & SUPPORT TICKETS TAB (SUPER ADMIN & SUPPORT ADMIN) */}
      {/* ============================================================ */}
      {adminTab === 'inquiries' && (isSupportAdmin || isSuperAdmin) && (
        <div className="clean-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LifeBuoy size={20} color="#0f294a" /> {isSupportAdmin ? 'Customer Inquiries & Support Tickets' : 'Support & Inquiries Management (Super Admin)'}
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.86rem', margin: 0 }}>
                {isSupportAdmin
                  ? 'Review buyer inquiries and dispatch official resolutions. Clients cannot reply to themselves.'
                  : 'Review exclusive Seller & Agent inquiries, oversee buyer inquiries, and dispatch official Administrator resolutions.'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {isSuperAdmin && (
                <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setAdminInquirySegment('ALL')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: adminInquirySegment === 'ALL' ? '#ffffff' : 'transparent',
                      color: adminInquirySegment === 'ALL' ? '#0f294a' : '#64748b',
                      boxShadow: adminInquirySegment === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    All Inquiries ({inquiryTickets.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminInquirySegment('SELLER_AGENT')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: adminInquirySegment === 'SELLER_AGENT' ? '#ffffff' : 'transparent',
                      color: adminInquirySegment === 'SELLER_AGENT' ? '#6d28d9' : '#64748b',
                      boxShadow: adminInquirySegment === 'SELLER_AGENT' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    ⭐ Seller & Agent Inquiries ({inquiryTickets.filter(t => (t.user || t.client)?.role === 'SELLER' || (t.user || t.client)?.role === 'AGENT').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminInquirySegment('BUYER')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: adminInquirySegment === 'BUYER' ? '#ffffff' : 'transparent',
                      color: adminInquirySegment === 'BUYER' ? '#0369a1' : '#64748b',
                      boxShadow: adminInquirySegment === 'BUYER' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                    }}
                  >
                    Buyer Inquiries ({inquiryTickets.filter(t => (t.user || t.client)?.role === 'BUYER' || (!(t.user || t.client)?.role)).length})
                  </button>
                </div>
              )}

              <select
                value={ticketFilterStatus}
                onChange={(e) => setTicketFilterStatus(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
              >
                <option value="ALL">All Ticket Statuses</option>
                <option value="OPEN">Open Inquiries</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Client / Submitter</th>
                  <th>Category & Priority</th>
                  <th>Subject & Details</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right', minWidth: '180px' }}>Admin Resolution & Actions</th>
                </tr>
              </thead>
              <tbody>
                {inquiryTickets
                  .filter(t => {
                    if (ticketFilterStatus !== 'ALL' && t.status !== ticketFilterStatus) return false;
                    if (isSuperAdmin && adminInquirySegment === 'SELLER_AGENT') {
                      const r = (t.user || t.client)?.role;
                      return r === 'SELLER' || r === 'AGENT';
                    }
                    if (isSuperAdmin && adminInquirySegment === 'BUYER') {
                      const r = (t.user || t.client)?.role;
                      return r === 'BUYER' || !r;
                    }
                    return true;
                  }).length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      No customer inquiry tickets matching criteria.
                    </td>
                  </tr>
                ) : (
                  inquiryTickets
                    .filter(t => {
                      if (ticketFilterStatus !== 'ALL' && t.status !== ticketFilterStatus) return false;
                      if (isSuperAdmin && adminInquirySegment === 'SELLER_AGENT') {
                        const r = (t.user || t.client)?.role;
                        return r === 'SELLER' || r === 'AGENT';
                      }
                      if (isSuperAdmin && adminInquirySegment === 'BUYER') {
                        const r = (t.user || t.client)?.role;
                        return r === 'BUYER' || !r;
                      }
                      return true;
                    })
                    .map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 700, color: '#0f294a' }}>
                          #TCK-{t.id}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>
                              {((t.user || t.client)?.fullName || 'Resident Client').split(' - ')[0]}
                            </span>
                            {(t.user || t.client)?.role === 'SELLER' && (
                              <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                                Seller (Admin Exclusive)
                              </span>
                            )}
                            {(t.user || t.client)?.role === 'AGENT' && (
                              <span style={{ background: '#ede9fe', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                                Agent (Admin Exclusive)
                              </span>
                            )}
                            {((t.user || t.client)?.role === 'BUYER' || !(t.user || t.client)?.role) && (
                              <span style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '1px 6px', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                                Buyer Inquiry
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            {(t.user || t.client)?.email || 'N/A'}
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.76rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, color: '#334155' }}>
                              {t.category}
                            </span>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: t.priority === 'HIGH' ? '#fee2e2' : '#fef3c7',
                              color: t.priority === 'HIGH' ? '#b91c1c' : '#b45309'
                            }}>
                              {t.priority}
                            </span>
                          </div>
                        </td>
                        <td style={{ maxWidth: '280px' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '2px' }}>{t.subject}</div>
                          <div style={{ fontSize: '0.78rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.message}>
                            {t.message}
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${t.status === 'RESOLVED' ? 'available' : t.status === 'IN_PROGRESS' ? 'reserved' : 'sold'}`}>
                            {t.status === 'RESOLVED' ? 'SOLVED' : t.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                            {t.status === 'RESOLVED' || t.status === 'CLOSED' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenAdminReplyTicket(t)}
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                title={t.responder?.fullName ? `Solved by ${t.responder.fullName}` : 'Solved'}
                              >
                                <Edit2 size={12} /> View Reply
                              </button>
                            ) : t.status === 'IN_PROGRESS' ? (
                              (() => {
                                const isMyResp = t.responder && (
                                  (currentUser?.id && t.responder.id === currentUser.id) ||
                                  (currentUser?.email && t.responder.email?.toLowerCase() === currentUser.email?.toLowerCase())
                                );
                                const isBuyerInq = (t.user || t.client)?.role === 'BUYER' || !(t.user || t.client)?.role;
                                const isAuthor = currentUser && (
                                  ((t.user || t.client)?.id && (t.user || t.client)?.id === currentUser.id) ||
                                  ((t.user || t.client)?.email && (t.user || t.client)?.email?.toLowerCase() === currentUser.email?.toLowerCase())
                                );
                                const canAgentEdit = currentUser?.role === 'AGENT' && isBuyerInq && isMyResp;
                                const canAdminEdit = (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPPORT_ADMIN') && (isMyResp || currentUser?.role === 'ADMIN');
                                const canDeleteInq = currentUser?.role !== 'AGENT' && (isAuthor || currentUser?.role === 'ADMIN');

                                return (
                                  <>
                                    {(canAgentEdit || canAdminEdit) ? (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAdminReplyTicket(t)}
                                        className="btn-primary"
                                        style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <Edit2 size={12} /> Edit
                                      </button>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: '0.74rem',
                                          color: '#475569',
                                          background: '#f1f5f9',
                                          padding: '3px 8px',
                                          borderRadius: '6px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          border: '1px solid #e2e8f0'
                                        }}
                                        title={`Handled by ${t.responder?.fullName || 'Staff'} (${t.responder?.role || 'Staff'})`}
                                      >
                                        <Clock size={11} color="#64748b" /> In Progress ({formatShortStaffName(t.responder?.fullName)})
                                      </span>
                                    )}
                                    {canDeleteInq && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAdminTicket(t.id)}
                                        className="btn-danger"
                                        style={{ padding: '4px 7px', borderRadius: '6px' }}
                                        title="Delete Ticket"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </>
                                );
                              })()
                            ) : (
                              (() => {
                                const isBuyerInq = (t.user || t.client)?.role === 'BUYER' || !(t.user || t.client)?.role;
                                const isAuthor = currentUser && (
                                  ((t.user || t.client)?.id && (t.user || t.client)?.id === currentUser.id) ||
                                  ((t.user || t.client)?.email && (t.user || t.client)?.email?.toLowerCase() === currentUser.email?.toLowerCase())
                                );
                                const isMyResp = t.responder && (
                                  (currentUser?.id && t.responder.id === currentUser.id) ||
                                  (currentUser?.email && t.responder.email?.toLowerCase() === currentUser.email?.toLowerCase())
                                );
                                const canAgentEdit = currentUser?.role === 'AGENT' && isBuyerInq && isMyResp;
                                const canAgentReply = currentUser?.role === 'AGENT' && !isAuthor && isBuyerInq && !t.staffResponse && !t.responder;
                                const canAdminReply = (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPPORT_ADMIN') && !isAuthor;
                                const canDeleteInq = currentUser?.role !== 'AGENT' && (isAuthor || currentUser?.role === 'ADMIN');

                                return (
                                  <>
                                    {canAgentEdit && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAdminReplyTicket(t)}
                                        className="btn-primary"
                                        style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <Edit2 size={12} /> Edit
                                      </button>
                                    )}
                                    {(canAgentReply || canAdminReply) && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAdminReplyTicket(t)}
                                        className="btn-primary"
                                        style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <MessageSquare size={12} /> Reply
                                      </button>
                                    )}
                                    {canDeleteInq && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteAdminTicket(t.id)}
                                        className="btn-danger"
                                        style={{ padding: '4px 7px', borderRadius: '6px' }}
                                        title="Delete Ticket"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </>
                                );
                              })()
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CUSTOMER REVIEWS FOR APARTMENTS (Support Admin) */}
      {/* ============================================================ */}
      {adminTab === 'reviews' && (isSupportAdmin || isSuperAdmin) && (
        <div className="clean-card" style={{ padding: '28px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Star size={22} color="#d97706" fill="#f59e0b" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.35rem', color: '#0f172a', margin: '0 0 4px', fontWeight: 800 }}>
                    Customer Reviews for Apartments
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0 }}>
                    Verified resident review moderation desk. Inspect customer walkthrough feedback and remove inappropriate or violating entries.
                  </p>
                </div>
              </div>
            </div>

            {/* Governance Badge: View & Delete Only */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '8px 16px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.82rem',
              color: '#334155',
              fontWeight: 600
            }}>
              <Lock size={15} color="#d97706" />
              <span>Read & Delete Only Access</span>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                Total Customer Reviews
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                {reviewStats.total}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                Verified resident feedback
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                Average Overall Score
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                  {reviewStats.avg}
                </span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      size={15}
                      fill={star <= Math.round(Number(reviewStats.avg)) ? '#f59e0b' : '#e2e8f0'}
                      color={star <= Math.round(Number(reviewStats.avg)) ? '#d97706' : '#cbd5e1'}
                    />
                  ))}
                </div>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                Across all apartment portfolios
              </div>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                5-Star High Praise
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#15803d' }}>
                {reviewStats.fiveStar}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#166534', marginTop: '2px' }}>
                {reviewStats.total > 0 ? Math.round((reviewStats.fiveStar / reviewStats.total) * 100) : 0}% of all ratings
              </div>
            </div>

            <div style={{ background: reviewStats.lowStar > 0 ? '#fff7ed' : '#f8fafc', border: `1px solid ${reviewStats.lowStar > 0 ? '#ffedd5' : '#e2e8f0'}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '0.78rem', color: reviewStats.lowStar > 0 ? '#c2410c' : '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                Low Ratings (1-2 Stars)
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: reviewStats.lowStar > 0 ? '#ea580c' : '#0f172a' }}>
                {reviewStats.lowStar}
              </div>
              <div style={{ fontSize: '0.76rem', color: reviewStats.lowStar > 0 ? '#9a3412' : '#64748b', marginTop: '2px' }}>
                Flagged for customer care
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ position: 'relative', width: '340px', maxWidth: '100%' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                placeholder="Search reviews by apartment, resident, keywords..."
                className="form-input"
                style={{ paddingLeft: '36px', height: '40px', fontSize: '0.84rem' }}
              />
              {reviewSearch && (
                <button
                  onClick={() => setReviewSearch('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Rating Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All Reviews', count: allReviews.length },
                { id: '5', label: '5 Stars ★', count: allReviews.filter(r => r.rating === 5).length },
                { id: '4', label: '4 Stars ★', count: allReviews.filter(r => r.rating === 4).length },
                { id: '3', label: '3 Stars ★', count: allReviews.filter(r => r.rating === 3).length },
                { id: '2', label: '2 Stars ★', count: allReviews.filter(r => r.rating === 2).length },
                { id: '1', label: '1 Star ★', count: allReviews.filter(r => r.rating === 1).length },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setReviewRatingFilter(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    background: reviewRatingFilter === f.id ? '#0f294a' : '#f1f5f9',
                    color: reviewRatingFilter === f.id ? '#ffffff' : '#475569',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{f.label}</span>
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '0.70rem',
                    background: reviewRatingFilter === f.id ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                    color: reviewRatingFilter === f.id ? '#ffffff' : '#475569'
                  }}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Reviews Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="clean-table">
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Apartment Residence</th>
                  <th style={{ width: '20%' }}>Verified Resident</th>
                  <th style={{ width: '14%' }}>Rating & Date</th>
                  <th style={{ width: '32%' }}>Customer Experience Review</th>
                  <th style={{ width: '10%', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
                      <Star size={32} color="#94a3b8" style={{ marginBottom: '8px', display: 'inline-block' }} />
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                        No Customer Reviews Found
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                        {reviewSearch || reviewRatingFilter !== 'ALL'
                          ? 'No reviews match your current search query or rating filter.'
                          : 'No verified apartment reviews have been submitted yet.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((review) => {
                    const stars = Array.from({ length: 5 }, (_, i) => i + 1);
                    return (
                      <tr key={review.id}>
                        {/* Apartment Info */}
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.92rem', marginBottom: '3px' }}>
                            {review.listing?.title || 'Apartment Residence'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontSize: '0.78rem', fontWeight: 600, marginBottom: '4px' }}>
                            <MapPin size={12} />
                            <span>{review.listing?.city || 'Colombo'} • {review.listing?.district || 'Western'}</span>
                          </div>
                          {review.listing?.propertyType && (
                            <span style={{ fontSize: '0.70rem', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                              {review.listing.propertyType}
                            </span>
                          )}
                        </td>

                        {/* Verified Resident Info */}
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#0f172a', fontSize: '0.86rem', marginBottom: '2px' }}>
                            <UserCheck size={14} color="#15803d" />
                            <span>{review.user?.fullName || 'Verified Resident'}</span>
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '4px' }}>
                            {review.user?.email || 'N/A'}
                          </div>
                          <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                            VERIFIED BUYER
                          </span>
                        </td>

                        {/* Rating & Date */}
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '4px' }}>
                            {stars.map((s) => (
                              <Star
                                key={s}
                                size={14}
                                fill={s <= review.rating ? '#f59e0b' : '#e2e8f0'}
                                color={s <= review.rating ? '#d97706' : '#cbd5e1'}
                              />
                            ))}
                            <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a', marginLeft: '4px' }}>
                              {review.rating}.0
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: '#64748b' }}>
                            <Clock size={12} />
                            <span>
                              {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recent'}
                            </span>
                          </div>
                        </td>

                        {/* Review Comment */}
                        <td style={{ verticalAlign: 'top' }}>
                          <div style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            fontSize: '0.84rem',
                            color: '#334155',
                            lineHeight: 1.5,
                            fontStyle: 'italic'
                          }}>
                            "{review.comment}"
                          </div>
                        </td>

                        {/* Delete Action Button (ONLY option: view and delete) */}
                        <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteCustomerReview(review.id, review.listing?.title, review.user?.fullName)}
                            className="btn-danger"
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            title="Permanently delete this customer review"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. USER ROLE MANAGEMENT TAB */}
      {/* ============================================================ */}
      {adminTab === 'users' && isSuperAdmin && (
        <div className="clean-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={20} color="#0f294a" /> Registered User Accounts & Role Governance
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.86rem', margin: 0 }}>
                Manage user permissions, assign roles (Buyer, Seller, Agent, Admin), and enforce security access.
              </p>
            </div>

            {/* User Search Input */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <input
                type="text"
                placeholder="Search user name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: '32px', fontSize: '0.84rem' }}
              />
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="clean-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Contact Phone</th>
                  <th>Assigned Role</th>
                  <th style={{ textAlign: 'right' }}>Manage Access</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isCurrentAdmin = currentUser?.id === user.id;
                  const isMainAdmin = user.role === 'ADMIN' || user.email?.toLowerCase() === 'admin@gmail.com' || (isCurrentAdmin && currentUser?.role === 'ADMIN');
                  return (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 700, color: '#64748b' }}>#{user.id}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {user.fullName}
                        {isCurrentAdmin && (
                          <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px' }}>
                            You (Current Session)
                          </span>
                        )}
                      </td>
                      <td style={{ color: '#475569' }}>{user.email}</td>
                      <td style={{ color: '#64748b', fontSize: '0.82rem' }}>{user.phone || 'N/A'}</td>
                      <td>
                        {isMainAdmin ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              padding: '5px 12px',
                              borderRadius: '6px',
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                              cursor: 'default',
                              userSelect: 'none'
                            }}
                            title="Main Administrator Role (System Root)"
                          >
                            <Shield size={13} color="#92400e" />
                            Main Administrator
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateUserRole(user.id, user.email, e.target.value)}
                            disabled={isCurrentAdmin}
                            style={{
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: '6px',
                              width: 'auto',
                              maxWidth: '145px',
                              background: user.role === 'ADMIN' ? '#fef3c7'
                                : user.role === 'FINANCE_ADMIN' ? '#ecfdf5'
                                : user.role === 'SUPPORT_ADMIN' ? '#f0f9ff'
                                : '#f8fafc',
                              color: user.role === 'ADMIN' ? '#92400e'
                                : user.role === 'FINANCE_ADMIN' ? '#047857'
                                : user.role === 'SUPPORT_ADMIN' ? '#0369a1'
                                : '#0f294a',
                              border: user.role === 'ADMIN' ? '1px solid #fde68a'
                                : user.role === 'FINANCE_ADMIN' ? '1px solid #a7f3d0'
                                : user.role === 'SUPPORT_ADMIN' ? '1px solid #bae6fd'
                                : '1px solid #cbd5e1',
                              cursor: isCurrentAdmin ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <option value="BUYER">BUYER</option>
                            <option value="SELLER">SELLER</option>
                            <option value="AGENT">AGENT</option>
                            <option value="FINANCE_ADMIN">FINANCE ADMIN</option>
                            <option value="SUPPORT_ADMIN">SUPPORT ADMIN</option>
                          </select>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id, user.email, isMainAdmin || isCurrentAdmin)}
                          className="btn-danger"
                          style={{ padding: '5px 8px' }}
                          title={isMainAdmin || isCurrentAdmin ? "Delete Main Administrator Account" : "Delete User Account"}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. ANNOUNCEMENTS TAB */}
      {/* ============================================================ */}
      {adminTab === 'announcements' && isSuperAdmin && (
        <div className="clean-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Megaphone size={20} color="#d97706" /> System Announcements & Promotional Broadcasts
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.86rem', margin: 0 }}>
                Notices broadcasted here appear immediately in the consumer notification bell dropdown across all user sessions.
              </p>
            </div>

            <button onClick={handleOpenCreateAnn} className="btn-primary" style={{ padding: '9px 16px', fontSize: '0.85rem' }}>
              <Plus size={15} /> New Announcement
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {announcements.map((ann) => (
              <div key={ann.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', background: ann.active ? '#dcfce7' : '#fee2e2', color: ann.active ? '#15803d' : '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      {ann.active ? 'ACTIVE BROADCAST' : 'INACTIVE'}
                    </span>
                    <span style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Audience: {ann.targetRole}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '1.05rem', color: '#0f172a', margin: '0 0 4px' }}>{ann.title}</h4>
                  <p style={{ fontSize: '0.86rem', color: '#64748b', margin: 0 }}>{ann.content}</p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleOpenEditAnn(ann)} className="btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                    <Edit2 size={13} /> Edit
                  </button>
                  <button onClick={() => handleDeleteAnnouncement(ann.id, ann.title)} className="btn-danger" style={{ padding: '6px 10px' }} title="Delete Announcement">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. AUDIT TRAIL TAB */}
      {/* ============================================================ */}
      {adminTab === 'audit' && isSuperAdmin && (
        <div className="clean-card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', color: '#0f172a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="#2563eb" /> Security & Conveyance Audit Trail
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.86rem', margin: 0 }}>
                Immutable accountability logs recording every cross-module action, tour booking, payment, and security change.
              </p>
            </div>

            <div style={{ position: 'relative', minWidth: '260px' }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                style={{
                  fontSize: '0.84rem',
                  padding: '8px 14px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity / Module</th>
                  <th>Actor Email</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.74rem', background: '#f1f5f9', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, color: '#0f294a' }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: (log.module || log.entityName || '').includes('TRANSACTIONS') ? '#eff6ff'
                          : (log.module || log.entityName || '').includes('INQUIRY') || (log.module || log.entityName || '').includes('VIEWING') ? '#f0fdf4'
                          : (log.module || log.entityName || '').includes('ADMIN') ? '#fef3c7'
                          : (log.module || log.entityName || '').includes('SUPPORT') ? '#fdf4ff'
                          : '#f1f5f9',
                        color: (log.module || log.entityName || '').includes('TRANSACTIONS') ? '#1d4ed8'
                          : (log.module || log.entityName || '').includes('INQUIRY') || (log.module || log.entityName || '').includes('VIEWING') ? '#15803d'
                          : (log.module || log.entityName || '').includes('ADMIN') ? '#b45309'
                          : (log.module || log.entityName || '').includes('SUPPORT') ? '#a21caf'
                          : '#475569',
                        border: (log.module || log.entityName || '').includes('TRANSACTIONS') ? '1px solid #bfdbfe'
                          : (log.module || log.entityName || '').includes('INQUIRY') || (log.module || log.entityName || '').includes('VIEWING') ? '1px solid #bbf7d0'
                          : (log.module || log.entityName || '').includes('ADMIN') ? '1px solid #fde68a'
                          : (log.module || log.entityName || '').includes('SUPPORT') ? '1px solid #f5d0fe'
                          : '1px solid #e2e8f0',
                      }}>
                        {formatAuditModule(log.module || log.entityName)}
                      </span>
                    </td>
                    <td style={{ color: '#0f172a', fontWeight: 500, fontSize: '0.84rem' }}>
                      {log.actorEmail || log.performedBy || 'system'}
                    </td>
                    <td style={{ fontSize: '0.84rem', color: '#64748b' }}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ACCESS DENIED FALLBACK FOR UNAUTHORIZED DEPARTMENT TABS */}
      {(((adminTab === 'listings' || adminTab === 'users' || adminTab === 'announcements' || adminTab === 'audit') && !isSuperAdmin) ||
        (adminTab === 'viewings' && !isFinanceAdmin) ||
        (adminTab === 'inquiries' && !isSupportAdmin && !isSuperAdmin) ||
        (adminTab === 'reviews' && !isSupportAdmin && !isSuperAdmin)) && (
        <div className="clean-card" style={{ padding: '60px 24px', textAlign: 'center', margin: '20px 0' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', color: '#0f172a', fontWeight: 800, marginBottom: '8px' }}>
            Restricted Departmental Access
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            This administrative section is strictly isolated to its designated department administrator. Your current role is <strong>{userRole}</strong>.
          </p>
          <button
            onClick={() => _setAdminTab('overview')}
            className="btn-primary"
            style={{ padding: '10px 22px', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            Return to Executive Overview
          </button>
        </div>
      )}

      {/* ANNOUNCEMENT MODAL */}
      {annModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px', width: '100%' }}>
            <button
              onClick={() => setAnnModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.35rem', color: '#0f172a', marginBottom: '6px' }}>
              {editingAnnId ? 'Edit Broadcast Notice' : 'Broadcast New Announcement'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '18px' }}>
              Broadcasting will display this notification inside the header bell dropdown for the selected target audience.
            </p>

            <form onSubmit={handleSaveAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Headline *</label>
                <input
                  type="text"
                  required
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  style={{ width: '100%' }}
                  placeholder="e.g. Q4 Early Bird Discount: 5% Off Marina Tower"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Target Audience</label>
                  <select
                    value={annForm.targetRole}
                    onChange={(e) => setAnnForm({ ...annForm, targetRole: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="ALL">All Clients & Visitors</option>
                    <option value="BUYER">Registered Buyers</option>
                    <option value="SELLER">Property Sellers</option>
                    <option value="AGENT">Licensed Agents</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Broadcast Status</label>
                  <select
                    value={annForm.active ? 'true' : 'false'}
                    onChange={(e) => setAnnForm({ ...annForm, active: e.target.value === 'true' })}
                    style={{ width: '100%' }}
                  >
                    <option value="true">Active (Broadcasted)</option>
                    <option value="false">Inactive (Draft)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Announcement Body *</label>
                <textarea
                  rows="3"
                  required
                  value={annForm.content}
                  onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                  placeholder="Details regarding offer terms, validity dates, or scheduled maintenance..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setAnnModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingAnnId ? 'Update Notice' : 'Broadcast Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT VIEWING APPOINTMENT MODAL (Admin) */}
      {/* ============================================================ */}
      {viewingModalOpen && editingViewing && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={18} color="#2563eb" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>
                    Edit Viewing Tour #{editingViewing.id}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0 }}>
                    Adjust appointment date, time, assigned agent, and status.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Property & Buyer Summary Card */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '18px' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                {editingViewing.listing?.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                Location: {editingViewing.listing?.city} • Buyer: <strong style={{ color: '#0f172a' }}>{editingViewing.buyer?.fullName}</strong> ({editingViewing.buyer?.email})
              </div>
            </div>

            <form onSubmit={handleSaveViewing} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                    Inspection Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={viewingForm.appointmentDate}
                    onChange={(e) => setViewingForm({ ...viewingForm, appointmentDate: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                    Time Slot *
                  </label>
                  <select
                    required
                    value={viewingForm.appointmentTime}
                    onChange={(e) => setViewingForm({ ...viewingForm, appointmentTime: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM</option>
                    <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                    <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM</option>
                    <option value="01:00 PM - 02:00 PM">01:00 PM - 02:00 PM</option>
                    <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                    <option value="03:00 PM - 04:00 PM">03:00 PM - 04:00 PM</option>
                    <option value="04:00 PM - 05:00 PM">04:00 PM - 05:00 PM</option>
                    <option value="05:00 PM - 06:00 PM">05:00 PM - 06:00 PM</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                    Appointment Status *
                  </label>
                  <select
                    value={viewingForm.status}
                    onChange={(e) => setViewingForm({ ...viewingForm, status: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="REQUESTED">REQUESTED (Pending Review)</option>
                    <option value="CONFIRMED">CONFIRMED (Scheduled)</option>
                    <option value="RESCHEDULED">RESCHEDULED (Adjusted Slot)</option>
                    <option value="COMPLETED">COMPLETED (Tour Finished)</option>
                    <option value="CANCELLED">CANCELLED (Withdrawn)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                    Assigned Real Estate Agent
                  </label>
                  <select
                    value={viewingForm.agentId}
                    onChange={(e) => setViewingForm({ ...viewingForm, agentId: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="">-- Unassigned / No Agent --</option>
                    {(allAgents.length > 0 ? allAgents : allUsers.filter(u => u.role === 'AGENT' || u.role === 'STAFF')).map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.fullName} ({ag.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                  Admin / Special Tour Notes
                </label>
                <textarea
                  rows="3"
                  value={viewingForm.notes}
                  onChange={(e) => setViewingForm({ ...viewingForm, notes: e.target.value })}
                  placeholder="e.g. VIP client requesting penthouse rooftop terrace inspection, security gate pass pre-issued..."
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setViewingModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Viewing Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* RESPOND TO CUSTOMER INQUIRIES TICKET MODAL (Admin Only) */}
      {/* ============================================================ */}
      {ticketReplyModalOpen && activeAdminTicket && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px', width: '100%', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LifeBuoy size={18} color="#2563eb" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>
                    {(activeAdminTicket.user || activeAdminTicket.client)?.role === 'SELLER' || (activeAdminTicket.user || activeAdminTicket.client)?.role === 'AGENT'
                      ? 'Super Administrator Exclusive Resolution'
                      : 'Official Administrator Resolution'}
                  </h3>
                  <p style={{ fontSize: '0.76rem', color: '#64748b', margin: 0 }}>
                    Support Ticket #TCK-{activeAdminTicket.id} • {activeAdminTicket.category}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTicketReplyModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Client Inquiry Summary */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
              {((activeAdminTicket.user || activeAdminTicket.client)?.role === 'SELLER' || (activeAdminTicket.user || activeAdminTicket.client)?.role === 'AGENT') && (
                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '6px', padding: '8px 12px', marginBottom: '10px', fontSize: '0.78rem', color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Shield size={14} color="#7c3aed" />
                  <span><strong>Exclusive Super Admin Routing:</strong> Submitted by {(activeAdminTicket.user || activeAdminTicket.client)?.role === 'SELLER' ? 'Property Seller' : 'Licensed Agent'}.</span>
                </div>
              )}
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '4px' }}>
                Submitter: <strong style={{ color: '#0f172a' }}>{(activeAdminTicket.user || activeAdminTicket.client)?.fullName || 'Resident Client'}</strong> ({(activeAdminTicket.user || activeAdminTicket.client)?.email || 'N/A'})
                {((activeAdminTicket.user || activeAdminTicket.client)?.role) && (
                  <span style={{ marginLeft: '6px', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: '#e2e8f0', color: '#334155', fontWeight: 600 }}>
                    Role: {(activeAdminTicket.user || activeAdminTicket.client)?.role}
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem', marginBottom: '4px' }}>
                {activeAdminTicket.subject}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#334155', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                "{activeAdminTicket.message}"
              </div>
            </div>

            {activeAdminTicket.status === 'RESOLVED' || activeAdminTicket.status === 'CLOSED' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: '#f0fdf4',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0',
                  color: '#166534',
                  fontSize: '0.84rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '6px' }}>
                    <Lock size={15} color="#166534" />
                    <span>Confirmed Resolution (Solved & Permanently Locked)</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#15803d', marginBottom: '8px' }}>
                    This inquiry has been completed. In accordance with system policy, no one can edit or delete inquiries after completion.
                  </div>
                  {activeAdminTicket.responder && (
                    <div style={{ fontSize: '0.74rem', background: '#dcfce7', display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      Resolved by: {activeAdminTicket.responder.fullName} ({activeAdminTicket.responder.role})
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                    Official Resolution Response
                  </label>
                  <div style={{
                    background: '#f8fafc',
                    padding: '12px 14px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.88rem',
                    color: '#1e293b',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {activeAdminTicket.staffResponse || '(No response text recorded)'}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setTicketReplyModalOpen(false)}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveAdminTicketReply} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                    Ticket Resolution Status *
                  </label>
                  <select
                    value={adminTicketStatus}
                    onChange={(e) => setAdminTicketStatus(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="IN_PROGRESS">IN PROGRESS (Under review — you can edit or delete later)</option>
                    <option value="RESOLVED">CONFIRMED AS SOLVED (Permanently locks this ticket)</option>
                  </select>
                </div>

                <div style={{
                  background: adminTicketStatus === 'RESOLVED' ? '#fef2f2' : '#f0f9ff',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${adminTicketStatus === 'RESOLVED' ? '#fecaca' : '#bae6fd'}`,
                  fontSize: '0.8rem',
                  color: adminTicketStatus === 'RESOLVED' ? '#991b1b' : '#0369a1'
                }}>
                  {adminTicketStatus === 'RESOLVED' ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <Lock size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Permanent Lock:</strong> Confirming as Solved permanently locks this ticket. Neither you nor any other staff member (Admin or Agent) will be able to edit or delete it afterwards.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <Clock size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong>Exclusive Ownership:</strong> By keeping this In Progress, this ticket is assigned exclusively to you ({currentUser?.fullName}). Other agents and admins cannot edit or reply to it.
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '5px' }}>
                    Administrator Official Response *
                  </label>
                  <textarea
                    rows="4"
                    required
                    value={adminReplyText}
                    onChange={(e) => setAdminReplyText(e.target.value)}
                    placeholder="Provide authoritative guidance, legal deed status, payment clarification, or appointment instructions..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setTicketReplyModalOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {adminTicketStatus === 'RESOLVED' ? 'Confirm as Solved & Lock' : 'Save as In Progress'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2.9 FINANCE DEPARTMENT OFFICIAL TAX INVOICE MODAL (ADMIN) */}
      {/* ============================================================ */}
      {adminInvoiceModalOpen && selectedInvoiceData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%', padding: '36px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setAdminInvoiceModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* Print Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f294a', paddingBottom: '20px', marginBottom: '24px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: '#0f294a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={16} color="#f59e0b" />
                  </div>
                  <h3 style={{ fontSize: '1.25rem', color: '#0f172a', margin: 0, fontWeight: 800 }}>PROPERTY FLOW</h3>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Finance & Settlement Department</p>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>Marina Tower, Colombo 01, Sri Lanka • VAT Reg: LK-99281740-001</p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '1.25rem', color: '#0f294a', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tax Invoice
                </h2>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{selectedInvoiceData.invoiceNumber || selectedInvoiceData.invoiceNo || `INV-${selectedInvoiceData.id}`}</p>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                  Date: {selectedInvoiceData.reservationDate ? new Date(selectedInvoiceData.reservationDate).toLocaleDateString() : '2026-09-17'}
                </p>
              </div>
            </div>

            {/* Client & Residence Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px', fontSize: '0.85rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>Billed To (Buyer)</p>
                <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{selectedInvoiceData.buyer?.fullName || 'Purchaser'}</p>
                <p style={{ color: '#64748b', margin: '0 0 2px' }}>{selectedInvoiceData.buyer?.email}</p>
                {selectedInvoiceData.buyer?.phone && <p style={{ color: '#64748b', margin: '0 0 2px' }}>{selectedInvoiceData.buyer.phone}</p>}
                <p style={{ color: '#64748b', margin: 0 }}>Client ID: #CL-{selectedInvoiceData.buyer?.id || '04'}</p>
              </div>

              <div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 4px' }}>Property Details</p>
                <p style={{ fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{selectedInvoiceData.listing?.title || `Apartment Unit #${selectedInvoiceData.listingId}`}</p>
                <p style={{ color: '#64748b', margin: '0 0 2px' }}>{selectedInvoiceData.listing?.city || 'Colombo'} • {selectedInvoiceData.listing?.district || 'Western Province'}</p>
                <p style={{ color: '#64748b', margin: 0 }}>Settlement Plan: {selectedInvoiceData.pricingPlan || 'Standard Commitment'}</p>
              </div>
            </div>

            {/* Line Items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', fontSize: '0.88rem' }}>
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
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Plan: {selectedInvoiceData.pricingPlan || 'Standard'}
                      {(selectedInvoiceData.pricingStrategy === 'FULL_CASH' || selectedInvoiceData.pricingPlan?.toLowerCase().includes('full')) && ' (2% Discount Applied)'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600 }}>
                    {selectedInvoiceData.offerAmount?.toLocaleString()}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 10px' }}>
                    <strong>Down Payment / Paid Deposit</strong>
                    <div style={{ fontSize: '0.78rem', color: '#15803d' }}>Status: {selectedInvoiceData.status}</div>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#0f294a' }}>
                    {selectedInvoiceData.depositAmount?.toLocaleString()}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
                  <td style={{ padding: '12px 10px' }}>
                    <strong>Remaining Price to be Paid</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Balance Due</div>
                  </td>
                  <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: (selectedInvoiceData.pricingStrategy === 'FULL_CASH' || selectedInvoiceData.pricingPlan?.toLowerCase().includes('full')) ? '#15803d' : '#b45309' }}>
                    {(selectedInvoiceData.pricingStrategy === 'FULL_CASH' || selectedInvoiceData.pricingPlan?.toLowerCase().includes('full'))
                      ? 'LKR 0 (Fully Settled)'
                      : `LKR ${Math.max(0, (selectedInvoiceData.offerAmount || 0) - (selectedInvoiceData.depositAmount || 0)).toLocaleString()}`}
                  </td>
                </tr>

                {/* Refund Policy Credit Note Breakdown when Cancelled */}
                {selectedInvoiceData.status === 'CANCELLED' && (
                  <>
                    {selectedInvoiceData.refundTaxDeduction > 0 && (
                      <tr style={{ borderBottom: '1px solid #fecaca', background: '#fef2f2' }}>
                        <td style={{ padding: '10px', color: '#b45309' }}>
                          <strong>Cancellation Tax / Statutory Cutoff (15%)</strong>
                          <div style={{ fontSize: '0.74rem' }}>Applied under Partial Refund Strategy (Days 3–7)</div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#b45309' }}>
                          - {selectedInvoiceData.refundTaxDeduction?.toLocaleString()}
                        </td>
                      </tr>
                    )}
                    <tr style={{ background: '#f0fdf4', borderBottom: '2px solid #86efac' }}>
                      <td style={{ padding: '12px 10px', color: '#15803d' }}>
                        <strong>Net Refund Payable / Credited to Buyer</strong>
                        <div style={{ fontSize: '0.74rem' }}>
                          Policy: {selectedInvoiceData.refundType === 'FULL_REFUND' ? 'Full Refund (Days 0–2, 100%)' : selectedInvoiceData.refundType === 'PARTIAL_REFUND' ? 'Partial Refund (Days 3–7, -15% Tax)' : 'Strict Non-Refundable (> 1 Week)'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 900, fontSize: '1.05rem', color: '#15803d' }}>
                        LKR {(selectedInvoiceData.refundAmount !== undefined && selectedInvoiceData.refundAmount !== null ? selectedInvoiceData.refundAmount : selectedInvoiceData.depositAmount)?.toLocaleString()}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            {/* Stamp & Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={26} color={selectedInvoiceData.status === 'CANCELLED' ? '#b91c1c' : '#15803d'} />
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                    {selectedInvoiceData.status === 'CANCELLED' ? 'Finance Cancellation & Refund Statement' : 'Finance Verified Settlement Receipt'}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                    {selectedInvoiceData.status === 'CANCELLED' ? 'Unit released back to public availability under statutory terms' : 'Authorized by Property Flow Finance Department'}
                  </p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge badge-${selectedInvoiceData.status === 'CANCELLED' ? 'declined' : (selectedInvoiceData.status === 'PAYMENT_RECEIVED' || selectedInvoiceData.status === 'CONFIRMED' || selectedInvoiceData.status === 'COMPLETED' ? 'available' : 'reserved')}`}>
                  {selectedInvoiceData.status === 'CANCELLED' ? 'Cancelled / Refund Processed' : selectedInvoiceData.status}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setAdminInvoiceModalOpen(false)} className="btn-secondary">
                Close
              </button>
              <button type="button" onClick={() => window.print()} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Printer size={15} /> {selectedInvoiceData.status === 'CANCELLED' ? 'Print Credit Note' : 'Print Tax Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN EDIT LISTING & REASSIGN SELLER MODAL */}
      {editListingModalOpen && editingListingData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
            <button
              onClick={() => { setEditListingModalOpen(false); setEditingListingData(null); }}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.35rem', color: '#0f172a', margin: '0 0 6px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingListingData.id ? (
                <>
                  <Building size={20} color="#0f294a" /> Edit Residence & Reassign Seller
                </>
              ) : (
                <>
                  <Plus size={20} color="#059669" /> Add Apartment Directly to Website
                </>
              )}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '20px' }}>
              {editingListingData.id
                ? 'Update property specifications, current moderation status, and assign the authentic seller/developer.'
                : 'Super Admin Direct Access: Publish a new residence directly to the website without requiring external approval. It will go live immediately.'}
            </p>

            <form onSubmit={handleSaveListingEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Property Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marina Bayview Penthouse Suite"
                  value={editingListingData.title}
                  onChange={(e) => setEditingListingData({ ...editingListingData, title: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingListingData.description || ''}
                  onChange={(e) => setEditingListingData({ ...editingListingData, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                  placeholder="Comprehensive apartment overview, architectural features, neighborhood highlights..."
                />
              </div>

              {/* SELLER / DEVELOPER SELECTION */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0f294a', marginBottom: '4px' }}>
                  Assigned Seller / Developer *
                </label>
                <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '0 0 8px' }}>
                  {editingListingData.id
                    ? 'Select the registered seller or property developer entity that owns this apartment listing.'
                    : 'Assign a registered seller or property developer, or select Administrator for direct Admin portfolio.'}
                </p>
                <select
                  value={editingListingData.sellerId || ''}
                  onChange={(e) => setEditingListingData({ ...editingListingData, sellerId: e.target.value ? Number(e.target.value) : null })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 600, color: '#0f172a' }}
                >
                  <option value="">-- Direct Admin Portfolio (No external seller) --</option>
                  {allUsers.filter(u => u.role === 'SELLER').map((u) => (
                    <option key={u.id} value={u.id}>
                      Seller: {u.fullName} ({u.email})
                    </option>
                  ))}
                  {allUsers.filter(u => u.role === 'ADMIN').map((u) => (
                    <option key={u.id} value={u.id}>
                      Administrator: {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Property Type</label>
                  <select
                    value={editingListingData.propertyType}
                    onChange={(e) => setEditingListingData({ ...editingListingData, propertyType: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="Luxury Suite">Luxury Suite</option>
                    <option value="Penthouse">Penthouse</option>
                    <option value="Standard Apartment">Standard Apartment</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Price (LKR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 85000000"
                    value={editingListingData.price}
                    onChange={(e) => setEditingListingData({ ...editingListingData, price: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Bedrooms</label>
                  <input
                    type="number"
                    min="1"
                    value={editingListingData.bedrooms}
                    onChange={(e) => setEditingListingData({ ...editingListingData, bedrooms: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Bathrooms</label>
                  <input
                    type="number"
                    min="1"
                    value={editingListingData.bathrooms}
                    onChange={(e) => setEditingListingData({ ...editingListingData, bathrooms: parseInt(e.target.value) || 1 })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Size (sq.ft)</label>
                  <input
                    type="number"
                    min="100"
                    value={editingListingData.sizeSqft}
                    onChange={(e) => setEditingListingData({ ...editingListingData, sizeSqft: parseFloat(e.target.value) || 500 })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>City</label>
                  <input
                    type="text"
                    required
                    value={editingListingData.city}
                    onChange={(e) => setEditingListingData({ ...editingListingData, city: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>District</label>
                  <input
                    type="text"
                    value={editingListingData.district}
                    onChange={(e) => setEditingListingData({ ...editingListingData, district: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Address</label>
                <input
                  type="text"
                  required
                  value={editingListingData.address}
                  onChange={(e) => setEditingListingData({ ...editingListingData, address: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Amenities</label>
                <input
                  type="text"
                  value={editingListingData.amenities || ''}
                  onChange={(e) => setEditingListingData({ ...editingListingData, amenities: e.target.value })}
                  style={{ width: '100%' }}
                  placeholder="e.g. 24/7 Security, Infinity Pool, Gym, Reserved Parking"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Listing Status</label>
                <select
                  value={editingListingData.status}
                  onChange={(e) => setEditingListingData({ ...editingListingData, status: e.target.value })}
                  style={{ width: '100%', fontWeight: 700 }}
                >
                  <option value="AVAILABLE">AVAILABLE (Direct Live on Website • No Approval Required)</option>
                  <option value="DRAFT">DRAFT (Draft • Hidden until activated)</option>
                  <option value="REVOKED">REVOKED (Revoke • Hidden from Homepage)</option>
                  <option value="RESERVED">RESERVED (Buyer Reservation Active)</option>
                  <option value="SOLD">SOLD (Full Settlement Completed)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Property Image</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    value={editingListingData.imageUrl || ''}
                    onChange={(e) => setEditingListingData({ ...editingListingData, imageUrl: e.target.value })}
                    style={{ flex: 1 }}
                    placeholder="https://images.unsplash.com/... or upload local image file"
                  />
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '0 12px',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: '#334155',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Browse...
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleAdminListingImageFileChange}
                    />
                  </label>
                </div>
                {editingListingData.imageUrl && (
                  <div style={{ marginTop: '6px', height: '110px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#000' }}>
                    <img
                      src={editingListingData.imageUrl}
                      alt="Property Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setEditListingModalOpen(false); setEditingListingData(null); }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 22px',
                    fontWeight: 700,
                    background: editingListingData.id ? '#0f294a' : '#059669',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {editingListingData.id ? (
                    'Save & Update Listing'
                  ) : (
                    <>
                      <Plus size={16} /> Publish Directly to Website (Live)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN CANCELLATION & REFUND POLICY MODAL */}
      <RefundModal
        isOpen={adminRefundModalOpen}
        onClose={() => {
          setAdminRefundModalOpen(false);
          setAdminCancelTargetTxn(null);
        }}
        txn={adminCancelTargetTxn}
        isAdmin={true}
        onConfirmCancel={async (txnId, testDays) => {
          const res = await api.cancelReservation(txnId, testDays);
          if (showToast) {
            showToast(`Reservation cancelled. ${res.refundNotes || res.message || 'Refund processed.'}`);
          }
          loadAdminData();
        }}
        showToast={showToast}
      />

      {/* SELF-DELETION ERROR POPUP MODAL */}
      {selfDeleteErrorModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1200 }}
          onClick={() => setSelfDeleteErrorModal(false)}
        >
          <div
            className="modal-content"
            style={{
              maxWidth: '460px',
              width: '90%',
              padding: '30px 24px',
              textAlign: 'center',
              borderRadius: '16px',
              border: '1px solid #fecaca',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                border: '2px solid #fca5a5'
              }}
            >
              <AlertTriangle size={32} color="#dc2626" />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#991b1b', margin: '0 0 10px' }}>
              Action Prohibited!
            </h3>

            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, margin: '0 0 24px' }}>
              The <strong style={{ color: '#0f172a' }}>Main Administrator</strong> cannot delete their own account. Root system access must be maintained at all times.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setSelfDeleteErrorModal(false)}
                className="btn-danger"
                style={{
                  padding: '10px 28px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <X size={16} /> Understood / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
