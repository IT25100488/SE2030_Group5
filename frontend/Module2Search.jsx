import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Filter, Heart, BookmarkPlus, MapPin, Bed, Bath, Maximize2, Trash2, Bell, Sparkles, X, Eye, Calculator, ShieldCheck, CheckCircle2, Building, DollarSign, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Edit2 } from 'lucide-react';
import { api } from '../api';

import { Star, MessageSquare } from 'lucide-react'; // <-- Need this icon for reviews!

function ListingReviews({ listingId, currentUser, showToast }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eligibility, setEligibility] = useState({ canReview: false, hasCompletedViewing: false, hasReviewed: false, reason: '' });

  // New review form state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit review state
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (listingId) {
      loadReviewsAndEligibility();
    }
  }, [listingId, currentUser]);

  const loadReviewsAndEligibility = async () => {
    try {
      const [reviewData, eligData] = await Promise.all([
        api.getListingReviews(listingId),
        currentUser ? api.checkReviewEligibility(listingId) : Promise.resolve({ canReview: false, hasCompletedViewing: false, hasReviewed: false })
      ]);
      setReviews(reviewData || []);
      setEligibility(eligData || { canReview: false, hasCompletedViewing: false, hasReviewed: false });
    } catch (err) {
      console.error('Failed to load reviews or eligibility:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eligibility.canReview) {
      showToast(eligibility.reason || 'Only the buyer who reserved this apartment can leave a review.', 'error');
      return;
    }
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      await api.addReview(listingId, { rating: newRating, comment: newComment });
      showToast('Review submitted successfully!');
      setNewComment('');
      setNewRating(5);
      await loadReviewsAndEligibility();
    } catch (err) {
      showToast(err.message || 'Failed to submit review.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (review) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  const cancelEdit = () => {
    setEditingReviewId(null);
    setEditRating(5);
    setEditComment('');
  };

  const handleUpdate = async (reviewId) => {
    if (!editComment.trim()) return;
    setUpdating(true);
    try {
      await api.updateReview(reviewId, { rating: editRating, comment: editComment, listingId });
      showToast('Review updated successfully!');
      cancelEdit();
      await loadReviewsAndEligibility();
    } catch (err) {
      showToast(err.message || 'Failed to update review.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    setDeletingId(reviewId);
    try {
      await api.deleteReview(reviewId);
      showToast('Review deleted successfully!');
      if (editingReviewId === reviewId) cancelEdit();
      await loadReviewsAndEligibility();
    } catch (err) {
      showToast(err.message || 'Failed to delete review.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading reviews...</div>;

  return (
    <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h4 style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} color="#2563eb" /> Verified Resident Reviews ({reviews.length})
        </h4>
        {reviews.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
            <Star size={15} fill="#fbbf24" color="#fbbf24" />
            <span>{(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)} / 5.0</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
          No reviews yet. Only the verified resident who reserved this residence can post reviews.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {reviews.map(review => {
            const isAuthor = currentUser && (review.user?.email === currentUser.email || review.user?.id === currentUser.id);
            const isAdmin = currentUser?.role === 'ADMIN';
            const isEditing = editingReviewId === review.id;

            return (
              <div key={review.id} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: isAuthor ? '1px solid #93c5fd' : '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: isAuthor ? '#1e40af' : '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                      {review.user?.fullName?.[0] || 'R'}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{review.user?.fullName}</span>
                        {isAuthor && (
                          <span style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={11} /> Your Review
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{new Date(review.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} size={14} fill={star <= review.rating ? '#fbbf24' : 'none'} color={star <= review.rating ? '#fbbf24' : '#cbd5e1'} />
                      ))}
                    </div>

                    {/* Edit and Delete Actions for author or Admin */}
                    {!isEditing && (
                      <div style={{ display: 'flex', gap: '6px', marginLeft: '6px' }}>
                        {isAuthor && (
                          <button
                            type="button"
                            onClick={() => startEdit(review)}
                            title="Edit your review"
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              color: '#2563eb',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                        )}
                        {(isAuthor || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(review.id)}
                            disabled={deletingId === review.id}
                            title="Delete review"
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              color: '#dc2626',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} /> {deletingId === review.id ? 'Deleting...' : isAdmin && !isAuthor ? 'Delete (Admin)' : 'Delete'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div style={{ background: '#ffffff', padding: '14px', borderRadius: '6px', border: '1px solid #93c5fd', marginTop: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: '6px' }}>
                      Edit Rating:
                    </label>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setEditRating(star)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <Star size={20} fill={star <= editRating ? '#fbbf24' : 'none'} color={star <= editRating ? '#fbbf24' : '#cbd5e1'} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={editComment}
                      onChange={e => setEditComment(e.target.value)}
                      className="form-input"
                      rows="3"
                      style={{ width: '100%', resize: 'vertical', fontSize: '0.88rem', marginBottom: '10px' }}
                      required
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate(review.id)}
                        disabled={updating}
                        className="btn-primary"
                        style={{ padding: '4px 12px', fontSize: '0.78rem' }}
                      >
                        {updating ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#334155', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                    {review.comment}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Access Control & Writing Form */}
      {eligibility.canReview ? (
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #bfdbfe', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <ShieldCheck size={18} color="#2563eb" />
            <h5 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Write a Verified Resident Review</h5>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0 0 14px 0' }}>
            You completed a viewing tour of this apartment. Share your verified feedback and rating for other buyers to inspect.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 600 }}>Your Rating *</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <Star size={24} fill={star <= newRating ? '#fbbf24' : 'none'} color={star <= newRating ? '#fbbf24' : '#cbd5e1'} />
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#475569', marginBottom: '4px', fontWeight: 600 }}>Resident Experience / Comments *</label>
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Share your verified experience regarding this residence and acquisition process..."
                className="form-input"
                style={{ minHeight: '80px', width: '100%', resize: 'vertical' }}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
              {submitting ? 'Submitting...' : 'Post Verified Review'}
            </button>
          </form>
        </div>
      ) : eligibility.hasReviewed ? (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', color: '#1e40af', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
          <CheckCircle2 size={18} color="#2563eb" />
          <div>
            <strong>You have reviewed this apartment.</strong> You can edit or delete your review above at any time.
          </div>
        </div>
      ) : currentUser?.role === 'BUYER' ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', color: '#475569', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px' }}>
          <ShieldCheck size={18} color="#64748b" />
          <div>
            <strong>Verified Resident Policy:</strong> Only the buyer who reserved or purchased this apartment can write reviews. Other users can inspect property details and verified resident reviews above.
          </div>
        </div>
      ) : !currentUser ? (
        <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '12px 16px', color: '#64748b', fontSize: '0.84rem', textAlign: 'center', marginTop: '16px' }}>
          Sign in as the verified resident who reserved this apartment to leave or edit reviews.
        </div>
      ) : null}
    </div>
  );
}

export default function Module2Search({ onBookViewing, onStartPurchase, showToast, initialFavoritesOnly = false, initialCity = '', currentUser, initialKeyword = '', initialPropertyType = '', initialMaxPrice = '', initialListingId = null }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const listingsRef = useRef(null);

  const [viewMode, setViewMode] = useState(initialFavoritesOnly ? 'favorites' : 'all');

  useEffect(() => {
    if (initialFavoritesOnly) {
      setViewMode('favorites');
    }
  }, [initialFavoritesOnly]);

  const [filters, setFilters] = useState({
    keyword: initialKeyword || '',
    city: initialCity || '',
    minPrice: '',
    maxPrice: initialMaxPrice || '',
    bedrooms: '',
    propertyType: initialPropertyType || ''
  });

  const [savedSearches, setSavedSearches] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [savedTitle, setSavedTitle] = useState('');
  const [editingSavedSearchId, setEditingSavedSearchId] = useState(null);

  // Interactive Detailed Property Inspection Modal
  const [inspectedListing, setInspectedListing] = useState(null);
  const [simLoanYears, setSimLoanYears] = useState(15);
  const [simDownPaymentPct, setSimDownPaymentPct] = useState(20);

  // Optional deep-link from the guest home page: open one listing's detail view
  // once results have loaded. No effect when initialListingId is not provided.
  const openedInitialListingRef = useRef(false);
  useEffect(() => {
    if (!initialListingId || openedInitialListingRef.current || listings.length === 0) return;
    const match = listings.find((l) => l.id === initialListingId);
    if (match) {
      openedInitialListingRef.current = true;
      setInspectedListing(match);
    }
  }, [listings, initialListingId]);

  const performSearch = async () => {
    // Validate bounds
    if (filters.minPrice && parseFloat(filters.minPrice) < 0) {
      if (showToast) showToast('Minimum price cannot be negative.', 'error');
      return;
    }
    if (filters.maxPrice && parseFloat(filters.maxPrice) < 0) {
      if (showToast) showToast('Maximum price cannot be negative.', 'error');
      return;
    }
    if (filters.minPrice && filters.maxPrice && parseFloat(filters.minPrice) > parseFloat(filters.maxPrice)) {
      if (showToast) showToast('Minimum price cannot exceed maximum price.', 'error');
      return;
    }
    if (filters.bedrooms && parseInt(filters.bedrooms) < 1) {
      if (showToast) showToast('Bedrooms must be at least 1.', 'error');
      return;
    }

    setLoading(true);
    try {
      const cleanParams = {};
      if (filters.keyword) cleanParams.keyword = filters.keyword;
      if (filters.city) cleanParams.city = filters.city;
      if (filters.minPrice) cleanParams.minPrice = filters.minPrice;
      if (filters.maxPrice) cleanParams.maxPrice = filters.maxPrice;
      if (filters.bedrooms) cleanParams.bedrooms = filters.bedrooms;
      if (filters.propertyType) cleanParams.propertyType = filters.propertyType;

      const results = await api.searchListings(cleanParams);
      const sorted = (results || []).slice().sort((a, b) => (b.id || 0) - (a.id || 0));
      setListings(sorted);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      if (showToast) showToast(err.message || 'Error executing search.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedAndWishlist = async () => {
    try {
      const [saved, wish] = await Promise.all([
        api.getSavedSearches().catch(() => []),
        api.getWishlist().catch(() => [])
      ]);
      setSavedSearches(saved || []);
      setWishlist(wish || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    performSearch();
    loadSavedAndWishlist();
    const handleSandboxUpdate = () => performSearch();
    window.addEventListener('sandbox-data-updated', handleSandboxUpdate);
    return () => window.removeEventListener('sandbox-data-updated', handleSandboxUpdate);
  }, []);

  const handleToggleWishlist = async (listingId, title) => {
    const existing = wishlist.find(w => w.listing?.id === listingId);
    try {
      if (existing) {
        await api.removeFromWishlist(existing.id);
        if (showToast) showToast(`Removed from saved residences`);
      } else {
        await api.addToWishlist(listingId, 'Saved residence');
        if (showToast) showToast(`Saved "${title}" to your favorites`);
      }
      loadSavedAndWishlist();
    } catch (err) {
      if (showToast) showToast('Please sign in to save properties to your favorites.', 'error');
    }
  };

  const handleSaveSearchSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: savedTitle,
        city: filters.city || null,
        minPrice: filters.minPrice ? parseFloat(filters.minPrice) : null,
        maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : null,
        bedrooms: filters.bedrooms ? parseInt(filters.bedrooms) : null,
        propertyType: filters.propertyType || null,
        notifyEmail: true
      };

      if (editingSavedSearchId) {
        await api.updateSavedSearch(editingSavedSearchId, payload);
        if (showToast) showToast(`Updated search alert: "${savedTitle}"`);
      } else {
        await api.createSavedSearch(payload);
        if (showToast) showToast(`Saved search preference: "${savedTitle}"`);
      }
      setSaveModalOpen(false);
      setEditingSavedSearchId(null);
      loadSavedAndWishlist();
    } catch (err) {
      if (showToast) showToast('Please sign in to save search preferences.', 'error');
    }
  };

  const handleOpenEditSaved = (s) => {
    setEditingSavedSearchId(s.id);
    setSavedTitle(s.title);
    setSaveModalOpen(true);
  };

  const handleDeleteSaved = async (id) => {
    try {
      await api.deleteSavedSearch(id);
      if (showToast) showToast(`Search alert removed`);
      loadSavedAndWishlist();
    } catch (err) {
      if (showToast) showToast('Failed to remove search alert: ' + err.message, 'error');
    }
  };

  const handleApplySaved = (saved) => {
    setFilters({
      keyword: '',
      city: saved.city || '',
      minPrice: saved.minPrice || '',
      maxPrice: saved.maxPrice || '',
      bedrooms: saved.bedrooms || '',
      propertyType: saved.propertyType || ''
    });
    setTimeout(performSearch, 50);
  };

  const isWishlisted = (id) => wishlist.some(w => w.listing?.id === id);

  // Dynamic calculations for inspected property
  const calcEMI = (price, downPct, years) => {
    const downAmount = price * (downPct / 100);
    const loanPrincipal = price - downAmount;
    if (loanPrincipal <= 0) return 0;
    const monthlyRate = 0.12 / 12; // 12% p.a.
    const totalMonths = years * 12;
    return Math.round((loanPrincipal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1));
  };

  const displayedListings = useMemo(() => {
    // Fully sold apartments disappear from home apartment discovery list
    const activeList = listings.filter(l => l.status !== 'SOLD' && l.status !== 'ARCHIVED');
    if (viewMode === 'favorites') {
      const favListingIds = new Set(wishlist.map(w => w.listing?.id).filter(Boolean));
      return activeList.filter(l => favListingIds.has(l.id));
    }
    return activeList;
  }, [listings, viewMode, wishlist]);

  // Dynamic Pagination Calculations
  const totalItems = displayedListings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedListings = displayedListings.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    if (newPage === safeCurrentPage) return;
    setCurrentPage(newPage);
    if (listingsRef.current) {
      listingsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 6) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 32px 60px' }}>
      {/* Top Sub-Tab Navigation: All Residences vs Favourites */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', background: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => { setViewMode('all'); setCurrentPage(1); }}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.88rem',
              background: viewMode === 'all' ? '#0f294a' : 'transparent',
              color: viewMode === 'all' ? '#ffffff' : '#64748b',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Search size={15} /> All Residences ({listings.length})
          </button>
          {currentUser && (
            <button
              type="button"
              onClick={() => { setViewMode('favorites'); setCurrentPage(1); }}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.88rem',
                background: viewMode === 'favorites' ? '#dc2626' : 'transparent',
                color: viewMode === 'favorites' ? '#ffffff' : '#64748b',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Heart size={15} fill={wishlist.length > 0 ? (viewMode === 'favorites' ? '#ffffff' : '#ef4444') : 'none'} />
              Favourites ({wishlist.length})
            </button>
          )}
        </div>
      </div>

      {/* Title & Tagline */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '2.2rem', color: '#0f172a', marginBottom: '6px' }}>
          {viewMode === 'favorites' ? 'Your Saved Favourites & Shortlisted Residences' : 'Discover Luxury Apartments & Suites'}
        </h1>
        <p style={{ color: '#64748b', fontSize: '1rem' }}>
          {viewMode === 'favorites'
            ? 'Review and manage your shortlisted luxury apartments, compare floor plans, and schedule private viewing tours.'
            : 'Explore prime residential developments in Colombo, Kandy, and waterfront locations with real-time pricing and interactive financing tools.'}
        </p>
      </div>

      {/* Floating Search & Filter Bar */}
      <div className="clean-card" style={{ padding: '20px 24px', marginBottom: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Keyword Search</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
                placeholder="Ocean, Penthouse, Pool..."
                style={{ width: '100%', paddingLeft: '34px' }}
              />
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '12px' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>City / Location</label>
            <select
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="">All Cities</option>
              <option value="Colombo">Colombo</option>
              <option value="Rajagiriya">Rajagiriya</option>
              <option value="Kandy">Kandy</option>
              <option value="Negombo">Negombo</option>
              <option value="Bentota">Bentota</option>
              <option value="Nuwara Eliya">Nuwara Eliya</option>
              <option value="Galle">Galle</option>
              <option value="Mirissa">Mirissa</option>
              <option value="Mount Lavinia">Mount Lavinia</option>
              <option value="Battaramulla">Battaramulla</option>
              <option value="Trincomalee">Trincomalee</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Property Type</label>
            <select
              value={filters.propertyType}
              onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="">All Property Types</option>
              <option value="Luxury Suite">Luxury Suite</option>
              <option value="Penthouse">Penthouse</option>
              <option value="Standard Apartment">Standard Apartment</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Max Budget (LKR)</label>
            <select
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="">Any Budget</option>
              <option value="40000000">Under 40 Million LKR</option>
              <option value="60000000">Under 60 Million LKR</option>
              <option value="90000000">Under 90 Million LKR</option>
              <option value="150000000">Under 150 Million LKR</option>
              <option value="200000000">Under 200 Million LKR</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Bedrooms</label>
            <select
              value={filters.bedrooms}
              onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="">Any Bedrooms</option>
              <option value="1">1 Bedroom</option>
              <option value="2">2 Bedrooms</option>
              <option value="3">3 Bedrooms</option>
              <option value="4">4+ Bedrooms</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={performSearch} className="btn-primary" style={{ flex: 1, height: '42px' }}>
              <Search size={15} /> Find Homes
            </button>
            <button
              onClick={() => {
                setFilters({ keyword: '', city: '', minPrice: '', maxPrice: '', bedrooms: '', propertyType: '' });
                setCurrentPage(1);
                setTimeout(performSearch, 50);
              }}
              className="btn-secondary"
              style={{ height: '42px', padding: '0 12px' }}
              title="Reset Filters"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Saved Search & Wishlist Toolbar */}
      <div style={{ display: 'flex', justifyContent: savedSearches.length > 0 ? 'space-between' : 'flex-end', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        {savedSearches.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {savedSearches.map(s => (
              <span
                key={s.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600
                }}
              >
                <span onClick={() => handleApplySaved(s)} style={{ cursor: 'pointer' }}>📌 {s.title}</span>
                <Edit2
                  size={12}
                  onClick={(e) => { e.stopPropagation(); handleOpenEditSaved(s); }}
                  style={{ cursor: 'pointer', opacity: 0.7 }}
                  title="Edit Saved Search"
                />
                <X
                  size={13}
                  onClick={(e) => { e.stopPropagation(); handleDeleteSaved(s.id); }}
                  style={{ cursor: 'pointer', opacity: 0.7 }}
                  title="Delete Saved Search"
                />
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => {
              setEditingSavedSearchId(null);
              setSavedTitle(filters.city ? `${filters.city} Alert` : 'My Custom Search Alert');
              setSaveModalOpen(true);
            }}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
          >
            <BookmarkPlus size={14} color="#d97706" /> Save This Search
          </button>

          {currentUser && (
            <button
              type="button"
              onClick={() => { setViewMode(viewMode === 'favorites' ? 'all' : 'favorites'); setCurrentPage(1); }}
              style={{
                fontSize: '0.84rem',
                color: viewMode === 'favorites' ? '#dc2626' : '#64748b',
                background: viewMode === 'favorites' ? '#fef2f2' : '#ffffff',
                border: viewMode === 'favorites' ? '1px solid #fecaca' : '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '5px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700,
                transition: 'all 0.15s ease'
              }}
            >
              <Heart size={15} color="#ef4444" fill={wishlist.length > 0 ? '#ef4444' : 'none'} />
              {viewMode === 'favorites' ? 'Viewing Favourites' : 'Favourites'}: <strong style={{ color: '#0f172a' }}>{wishlist.length}</strong>
            </button>
          )}
        </div>
      </div>

      {/* Property Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: '#64748b' }}>Updating residences...</div>
      ) : displayedListings.length === 0 ? (
        <div className="clean-card" style={{ textAlign: 'center', padding: '60px' }}>
          {viewMode === 'favorites' ? (
            <div>
              <Heart size={44} color="#ef4444" style={{ marginBottom: '14px' }} />
              <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>Your Favourites List is Empty</h3>
              <p style={{ color: '#64748b', maxWidth: '460px', margin: '0 auto 18px' }}>
                Browse premier apartments and click the heart icon on any residence to save it to your personal shortlist.
              </p>
              <button onClick={() => { setViewMode('all'); setCurrentPage(1); }} className="btn-primary" style={{ padding: '8px 20px' }}>
                Explore All Residences
              </button>
            </div>
          ) : (
            <div>
              <h3 style={{ color: '#0f172a', marginBottom: '8px' }}>No properties found</h3>
              <p style={{ color: '#64748b' }}>Try broadening your search criteria or resetting filters.</p>
            </div>
          )}
        </div>
      ) : (
        <div ref={listingsRef} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
          {paginatedListings.map(item => {
            const isFav = isWishlisted(item.id);
            const pricePerSqft = item.sizeSqft > 0 ? Math.round(item.price / item.sizeSqft) : 0;
            const approxUSD = Math.round(item.price / 310);

            return (
              <div
                key={item.id}
                className="clean-card"
                style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease' }}
              >
                {/* Photo Header */}
                <div style={{ position: 'relative', height: '165px', backgroundColor: '#e2e8f0' }}>
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'; }}
                  />
                  <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
                    <span className={`badge badge-${item.status ? item.status.toLowerCase() : 'available'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                      {item.status}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleWishlist(item.id, item.title)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: '#ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title={isFav ? 'Remove from favorites' : 'Save to favorites'}
                  >
                    <Heart size={15} color={isFav ? '#dc2626' : '#94a3b8'} fill={isFav ? '#dc2626' : 'none'} />
                  </button>

                  <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(15, 23, 42, 0.85)', padding: '2px 8px', borderRadius: '5px', fontSize: '0.7rem', color: '#ffffff', fontWeight: 600 }}>
                    {item.propertyType}
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>
                    <MapPin size={13} /> {item.city} • {item.district}
                  </div>

                  <h3
                    onClick={() => setInspectedListing(item)}
                    style={{ fontSize: '1.02rem', color: '#0f172a', marginBottom: '4px', lineHeight: 1.25, cursor: 'pointer', fontWeight: 800 }}
                  >
                    {item.title}
                  </h3>

                  <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '8px', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }}>
                    {item.description}
                  </p>

                  {/* Specs Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: '8px', color: '#475569', fontSize: '0.76rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Bed size={13} /> {item.bedrooms} Beds</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Bath size={13} /> {item.bathrooms} Baths</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Maximize2 size={13} /> {item.sizeSqft} sq.ft</span>
                  </div>

                  {/* Realistic Pricing Section */}
                  <div style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase' }}>Purchase Price</span>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>≈ ${approxUSD.toLocaleString()} USD</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '1.15rem', color: '#0f294a', fontWeight: 800, margin: '2px 0' }}>
                        LKR {item.price.toLocaleString()}
                      </h4>
                      <span style={{ fontSize: '0.7rem', background: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                        LKR {pricePerSqft.toLocaleString()}/sq.ft
                      </span>
                    </div>
                  </div>

                  {/* Interactive Action Buttons */}
                  {item.status === 'SOLD' || item.status === 'RESERVED' ? (
                    <div style={{ marginTop: 'auto' }}>
                      <button
                        onClick={() => setInspectedListing(item)}
                        style={{
                          width: '100%',
                          background: '#fef2f2',
                          border: '1px solid #ef4444',
                          borderRadius: '6px',
                          padding: '8px',
                          fontSize: '0.78rem',
                          color: '#dc2626',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={14} color="#dc2626" /> View {item.status === 'SOLD' ? 'Sold' : 'Reserved'} Property & Reviews
                      </button>
                    </div>
                  ) : (
                    <>
                      {(!currentUser || currentUser?.role === 'BUYER') && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                          <button
                            onClick={() => onBookViewing(item)}
                            className="btn-secondary"
                            style={{ fontSize: '0.76rem', padding: '6px 4px' }}
                          >
                            Schedule Tour
                          </button>
                          <button
                            onClick={() => onStartPurchase(item)}
                            className="btn-primary"
                            style={{ fontSize: '0.76rem', padding: '6px 4px' }}
                          >
                            Reserve Residence
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => setInspectedListing(item)}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: '1px dashed #cbd5e1',
                          borderRadius: '6px',
                          padding: '5px',
                          fontSize: '0.74rem',
                          color: '#0f294a',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          cursor: 'pointer'
                        }}
                      >
                        <Eye size={12} color="#d97706" /> Inspect Full Details & Resident Reviews
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* BOTTOM PAGINATION CONTROLS (NEXT / PREVIOUS / PAGE NUMBERS) */}
      {/* ============================================================ */}
      {!loading && totalItems > 0 && (
        <div
          style={{
            marginTop: '36px',
            padding: '16px 24px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Left: Summary Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.88rem', color: '#475569' }}>
              Showing <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> of <strong>{totalItems}</strong> residences
            </span>
            <span
              style={{
                background: '#f1f5f9',
                color: '#0f294a',
                fontSize: '0.76rem',
                padding: '3px 8px',
                borderRadius: '6px',
                fontWeight: 700,
              }}
            >
              Page {safeCurrentPage} of {totalPages}
            </span>
          </div>

          {/* Center: Page Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => handlePageChange(1)}
              disabled={safeCurrentPage === 1}
              className="btn-pagination"
              title="Go to First Page"
              aria-label="First Page"
            >
              <ChevronsLeft size={16} />
            </button>

            <button
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="btn-pagination"
              title="Previous Page"
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} /> Prev
            </button>

            {getPageNumbers().map((p, idx) =>
              p === '...' ? (
                <span key={`dots-${idx}`} style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.88rem' }}>
                  ...
                </span>
              ) : (
                <button
                  key={`page-${p}`}
                  onClick={() => handlePageChange(p)}
                  className={`btn-pagination ${p === safeCurrentPage ? 'active' : ''}`}
                  title={`Page ${p}`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="btn-pagination"
              title="Next Page"
              aria-label="Next Page"
            >
              Next <ChevronRight size={16} />
            </button>

            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="btn-pagination"
              title="Go to Last Page"
              aria-label="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>

          {/* Right: Items per page buttons selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>Per page:</span>
            <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #e2e8f0', gap: '3px' }}>
              {[8, 12, 16].map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => handlePageSizeChange(size)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: pageSize === size ? '#0f294a' : 'transparent',
                    color: pageSize === size ? '#ffffff' : '#64748b',
                    fontWeight: pageSize === size ? 800 : 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: pageSize === size ? '0 2px 5px rgba(15, 41, 74, 0.2)' : 'none'
                  }}
                  title={`View ${size} apartments per page`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE PROPERTY INSPECTION MODAL */}
      {inspectedListing && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px', width: '100%', maxHeight: '92vh', overflowY: 'auto', padding: '32px' }}>
            <button
              onClick={() => setInspectedListing(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* Photo & Header */}
            <div style={{ position: 'relative', height: '260px', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
              <img
                src={inspectedListing.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80'}
                alt={inspectedListing.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(15, 23, 42, 0.88)', padding: '6px 14px', borderRadius: '8px', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
                {inspectedListing.propertyType} • {inspectedListing.city}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
              <div>
                <span className={`badge badge-${inspectedListing.status ? inspectedListing.status.toLowerCase() : 'available'}`} style={{ marginBottom: '6px' }}>
                  {inspectedListing.status}
                </span>
                <h2 style={{ fontSize: '1.5rem', color: '#0f172a', margin: '4px 0' }}>{inspectedListing.title}</h2>
                <p style={{ color: '#d97706', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <MapPin size={15} /> {inspectedListing.address}, {inspectedListing.district}, {inspectedListing.city}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Purchase Price</span>
                <h3 style={{ fontSize: '1.6rem', color: '#0f294a', fontWeight: 900, margin: 0 }}>
                  LKR {inspectedListing.price?.toLocaleString()}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  ≈ ${Math.round(inspectedListing.price / 310).toLocaleString()} USD • LKR {Math.round(inspectedListing.price / (inspectedListing.sizeSqft || 1)).toLocaleString()}/sq.ft
                </span>
              </div>
            </div>

            <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '20px' }}>
              {inspectedListing.description}
            </p>

            {/* Specifications Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Bedrooms</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f294a', margin: '2px 0 0' }}>{inspectedListing.bedrooms} Master Beds</p>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Bathrooms</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f294a', margin: '2px 0 0' }}>{inspectedListing.bathrooms} En-Suite</p>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Floor Space</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f294a', margin: '2px 0 0' }}>{inspectedListing.sizeSqft} sq.ft</p>
              </div>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Deed Title</span>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803d', margin: '2px 0 0' }}>Freehold Clear</p>
              </div>
            </div>

            {/* Amenities Checklist */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.9rem', color: '#0f172a', marginBottom: '8px', fontWeight: 700 }}>Exclusive Condominium Amenities:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {(inspectedListing.amenities || 'Pool, Gym, Security, Parking').split(',').map((amenity, idx) => (
                  <span key={idx} style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CheckCircle2 size={13} /> {amenity.trim()}
                  </span>
                ))}
              </div>
            </div>



            {/* Resident Reviews */}
            <ListingReviews
              listingId={inspectedListing.id}
              currentUser={currentUser}
              showToast={showToast}
            />

            {/* Action CTAs or Sold/Reserved Notice */}
            {inspectedListing.status === 'SOLD' || inspectedListing.status === 'RESERVED' ? (
              <div style={{
                background: inspectedListing.status === 'SOLD' ? '#fef2f2' : '#fffbeb',
                border: inspectedListing.status === 'SOLD' ? '1px solid #fecaca' : '1px solid #fde68a',
                borderRadius: '8px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '20px'
              }}>
                <ShieldCheck size={24} color={inspectedListing.status === 'SOLD' ? '#dc2626' : '#d97706'} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.94rem', color: inspectedListing.status === 'SOLD' ? '#991b1b' : '#92400e' }}>
                    This Residence is Currently {inspectedListing.status === 'SOLD' ? 'SOLD' : 'RESERVED'}
                  </div>
                  <div style={{ fontSize: '0.84rem', color: inspectedListing.status === 'SOLD' ? '#b91c1c' : '#b45309', marginTop: '2px', lineHeight: 1.4 }}>
                    Viewing tour bookings and reservation offers are closed for other users. You can inspect all architectural specifications, photos, and resident reviews above.
                  </div>
                </div>
              </div>
            ) : (!currentUser || currentUser?.role === 'BUYER') ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={() => {
                    const target = inspectedListing;
                    setInspectedListing(null);
                    onBookViewing(target);
                  }}
                  className="btn-secondary"
                  style={{ padding: '12px', fontSize: '0.9rem' }}
                >
                  Schedule Viewing Tour
                </button>
                <button
                  onClick={() => {
                    const target = inspectedListing;
                    setInspectedListing(null);
                    onStartPurchase(target);
                  }}
                  className="btn-primary"
                  style={{ padding: '12px', fontSize: '0.9rem' }}
                >
                  Reserve Residence Now
                </button>
              </div>
            ) : (
              <div style={{
                marginTop: '20px',
                padding: '12px 16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.86rem'
              }}>
                ℹ️ Tour scheduling and residence reservation options are available exclusively for registered Buyers.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SAVE SEARCH MODAL */}
      {saveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', width: '100%', padding: '28px' }}>
            <button
              onClick={() => setSaveModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.3rem', color: '#0f172a', marginBottom: '6px' }}>
              {editingSavedSearchId ? 'Edit Search Alert Preference' : 'Save Search Notification'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '16px' }}>
              {editingSavedSearchId
                ? 'Update the custom alert name for this saved search filter.'
                : 'Save this filter to your account for quick 1-click access and price alert notifications.'}
            </p>

            <form onSubmit={handleSaveSearchSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Alert Name *</label>
                <input
                  type="text"
                  required
                  value={savedTitle}
                  onChange={(e) => setSavedTitle(e.target.value)}
                  style={{ width: '100%' }}
                  placeholder="e.g. 3BHK Colombo Under 90M"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setSaveModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingSavedSearchId ? 'Update Preference' : 'Save Preference'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
