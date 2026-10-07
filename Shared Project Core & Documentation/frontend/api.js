import {
  isSandboxActive,
  createSimulatedReservation,
  processSimulatedPayment,
  cancelSimulatedReservation,
  calculateSimulatedRefundPreview,
  getSimulatedTransactions,
  createSimulatedAppointment,
  getSimulatedAppointments,
  submitSimulatedInquiry,
  getSimulatedInquiries,
  createSimulatedTicket,
  getSimulatedTickets,
  getSimulatedSoldListingIds,
  updateSimulatedTransactionStatus
} from './sandboxService';

const API_BASE = '/api';

export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token) => {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
};

export const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setStoredUser = (user) => {
  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
};

const request = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || `Request failed with status ${res.status}`);
  }

  // Handle empty responses
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  return null;
};

export const api = {
  // --- AUTH ---
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
  getAgents: () => request('/auth/agents'),
  updateProfile: (data) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  deleteProfile: () => request('/auth/profile', { method: 'DELETE' }),

  // --- MODULE 1: APARTMENT LISTING & INVENTORY (Member 1 - Perera M.C.S.) ---
  getPublicListings: async () => {
    const list = await request('/listings/public');
    const safeList = Array.isArray(list) ? list : [];
    if (isSandboxActive()) {
      const soldIds = getSimulatedSoldListingIds();
      return safeList
        .filter(item => !soldIds.includes(item.id) && item.status !== 'SOLD' && item.status !== 'ARCHIVED');
    }
    return safeList.filter(item => (item.status === 'AVAILABLE' || item.status === 'RESERVED') && item.status !== 'DRAFT' && item.status !== 'REVOKED' && item.status !== 'PENDING_APPROVAL');
  },
  getAllListings: () => request('/listings'),
  getMyListings: () => request('/listings/my-listings'),
  getListingById: (id) => request(`/listings/${id}`),
  getListingReviews: (id) => request(`/reviews/listing/${id}`),
  checkReviewEligibility: (id) => request(`/reviews/eligibility/${id}`),
  addReview: (id, data) => request(`/reviews`, { method: 'POST', body: JSON.stringify({ ...data, listingId: id }) }),
  updateReview: (id, data) => request(`/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteReview: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),
  createListing: (data) => request('/listings', { method: 'POST', body: JSON.stringify(data) }),
  updateListing: (id, data) => request(`/listings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateListingStatus: (id, status) => request(`/listings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteListing: (id) => request(`/listings/${id}`, { method: 'DELETE' }),

  // --- MODULE 2: SEARCH, DISCOVERY & WISHLIST (Member 2 - Rasanjana S.M.Y.) ---
  searchListings: async (params) => {
    const query = new URLSearchParams(params).toString();
    const results = await request(`/search?${query}`);
    const safeResults = Array.isArray(results) ? results : [];
    if (isSandboxActive()) {
      const soldIds = getSimulatedSoldListingIds();
      return safeResults
        .filter(item => !soldIds.includes(item.id) && item.status !== 'SOLD' && item.status !== 'ARCHIVED' && item.status !== 'DRAFT' && item.status !== 'REVOKED' && item.status !== 'PENDING_APPROVAL');
    }
    return safeResults.filter(item => (item.status === 'AVAILABLE' || item.status === 'RESERVED') && item.status !== 'DRAFT' && item.status !== 'REVOKED' && item.status !== 'PENDING_APPROVAL');
  },
  getSavedSearches: () => request('/search/saved'),
  createSavedSearch: (data) => request('/search/saved', { method: 'POST', body: JSON.stringify(data) }),
  updateSavedSearch: (id, data) => request(`/search/saved/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSavedSearch: (id) => request(`/search/saved/${id}`, { method: 'DELETE' }),
  getWishlist: () => request('/search/wishlist'),
  addToWishlist: (listingId, notes = '') => request(`/search/wishlist/${listingId}`, { method: 'POST', body: JSON.stringify({ notes }) }),
  removeFromWishlist: (wishlistId) => request(`/search/wishlist/${wishlistId}`, { method: 'DELETE' }),

  // --- MODULE 3: INQUIRY & VIEWINGS (Member 3 - Wijebandara G.G.T.D.) ---
  getAllAppointments: async () => {
    if (isSandboxActive()) {
      return getSimulatedAppointments();
    }
    return request('/appointments');
  },
  getMyAppointments: async () => {
    if (isSandboxActive()) {
      return getSimulatedAppointments();
    }
    return request('/appointments/my');
  },
  createAppointment: async (data) => {
    if (isSandboxActive()) {
      return createSimulatedAppointment(data, getStoredUser());
    }
    return request('/appointments', { method: 'POST', body: JSON.stringify(data) });
  },
  updateAppointment: (id, data) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  acceptAppointment: (id) => request(`/appointments/${id}/accept`, { method: 'PUT' }),
  deleteAppointment: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),
  getAllInquiries: async () => {
    if (isSandboxActive()) {
      return getSimulatedInquiries();
    }
    return request('/inquiries');
  },
  getMyInquiries: async () => {
    if (isSandboxActive()) {
      return getSimulatedInquiries();
    }
    return request('/inquiries/my');
  },
  submitInquiry: async (data) => {
    if (isSandboxActive()) {
      return submitSimulatedInquiry(data, getStoredUser());
    }
    return request('/inquiries', { method: 'POST', body: JSON.stringify(data) });
  },
  replyInquiry: (id, response) => request(`/inquiries/${id}/reply`, { method: 'PUT', body: JSON.stringify({ response }) }),
  deleteInquiry: (id) => request(`/inquiries/${id}`, { method: 'DELETE' }),

  // --- MODULE 4: PURCHASE, RESERVATIONS & TRANSACTIONS (Member 4 - Diwyanjali C.K.) ---
  getAllTransactions: async () => {
    if (isSandboxActive()) {
      return getSimulatedTransactions();
    }
    return request('/transactions');
  },
  getMyTransactions: async () => {
    if (isSandboxActive()) {
      return getSimulatedTransactions();
    }
    return request('/transactions/my');
  },
  getTransactionByInvoice: (invoiceNo) => request(`/transactions/invoice/${invoiceNo}`),
  createReservation: async (data) => {
    if (isSandboxActive()) {
      return createSimulatedReservation(data, getStoredUser());
    }
    return request('/transactions', { method: 'POST', body: JSON.stringify(data) });
  },
  processPayment: async (id, data) => {
    if (isSandboxActive() || String(id).startsWith('SIM-') || (typeof id === 'number' && id >= 80000)) {
      return processSimulatedPayment(id, data);
    }
    return request(`/transactions/${id}/pay`, { method: 'POST', body: JSON.stringify(data) });
  },
  updateTransactionStatus: async (id, status) => {
    if (isSandboxActive() || String(id).startsWith('SIM-') || (typeof id === 'number' && id >= 80000)) {
      return updateSimulatedTransactionStatus(id, status);
    }
    return request(`/transactions/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  },
  getRefundPreview: async (id, testDays) => {
    if (isSandboxActive() || String(id).startsWith('SIM-') || (typeof id === 'number' && id >= 80000)) {
      const txns = getSimulatedTransactions();
      const target = txns.find(t => String(t.id) === String(id));
      return calculateSimulatedRefundPreview(target, testDays);
    }
    const query = testDays !== undefined && testDays !== null ? `?testDays=${testDays}` : '';
    return request(`/transactions/${id}/refund-preview${query}`);
  },
  cancelReservation: async (id, testDays) => {
    if (isSandboxActive() || String(id).startsWith('SIM-') || (typeof id === 'number' && id >= 80000)) {
      return cancelSimulatedReservation(id, testDays);
    }
    const query = testDays !== undefined && testDays !== null ? `?testDays=${testDays}` : '';
    return request(`/transactions/${id}${query}`, { method: 'DELETE' });
  },

  // --- MODULE 5: CUSTOMER RELATIONSHIP & SUPPORT (Member 5 - Jameela I.R.) ---
  getAllTickets: async () => {
    if (isSandboxActive()) {
      return getSimulatedTickets();
    }
    return request('/support/tickets');
  },
  getMyTickets: async () => {
    if (isSandboxActive()) {
      return getSimulatedTickets();
    }
    return request('/support/tickets/my');
  },
  createTicket: async (data) => {
    if (isSandboxActive()) {
      return createSimulatedTicket(data, getStoredUser());
    }
    return request('/support/tickets', { method: 'POST', body: JSON.stringify(data) });
  },
  updateTicket: (id, data) => request(`/support/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTicket: (id) => request(`/support/tickets/${id}`, { method: 'DELETE' }),
  getAllReviews: () => request('/reviews'),
  getReviewsForListing: (listingId) => request(`/reviews/listing/${listingId}`),
  createReview: (data) => request('/reviews', { method: 'POST', body: JSON.stringify(data) }),
  deleteReview: (id) => request(`/reviews/${id}`, { method: 'DELETE' }),

  // --- MODULE 6: ADMIN, AUDIT & REPORTS (Member 6 - Senanayake D.L.S.) ---
  getDashboardStats: () => request('/admin/dashboard-stats'),
  getAllAnnouncements: () => request('/admin/announcements'),
  getPublicAnnouncements: () => request('/admin/announcements/public'),
  createAnnouncement: (data) => request('/admin/announcements', { method: 'POST', body: JSON.stringify(data) }),
  updateAnnouncement: (id, data) => request(`/admin/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnnouncement: (id) => request(`/admin/announcements/${id}`, { method: 'DELETE' }),
  getAuditLogs: () => request('/admin/audit-logs'),
  deleteAuditLog: () => { throw new Error('Audit logs are strictly append-only and immutable for regulatory compliance.'); },

  // --- USER MANAGEMENT (Admin) ---
  getAllUsers: () => request('/admin/users'),
  updateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
};

