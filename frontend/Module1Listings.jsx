import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, MapPin, Bed, Bath, Maximize2, AlertCircle, Building, CheckCircle2, Image as ImageIcon, X, UploadCloud, Clock, Lock, XCircle, Award, Receipt, FileText, User as UserIcon } from 'lucide-react';
import { api } from '../api';

export default function Module1Listings({ currentUser, showToast, confirmAction }) {
  const [listings, setListings] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [imageInputMode, setImageInputMode] = useState('file'); // 'file' | 'url'
  const [inventoryTab, setInventoryTab] = useState('ACTIVE'); // 'ACTIVE' | 'SOLD'
  const [sellerTransactions, setSellerTransactions] = useState([]);
  const [selectedSoldInvoice, setSelectedSoldInvoice] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    propertyType: 'Luxury Suite',
    price: 45000000,
    sizeSqft: 1500,
    bedrooms: 3,
    bathrooms: 2,
    address: '',
    city: 'Colombo',
    district: 'Colombo 03',
    amenities: 'Infinity Pool, Gym, 24/7 Security, Covered Parking, Ocean View Balcony',
    imageUrl: '',
    status: 'AVAILABLE',
    sellerId: null
  });

  // SPECIFICATIONS BLOCK POLICY:
  // After Super Admin approval (status !== 'DRAFT' and status !== 'PENDING_APPROVAL'),
  // both Agent and Seller can ONLY edit Title, Description, and Cover Image.
  // The Specifications Block (Price, Property Type, Size, Bedrooms, Bathrooms, Location, Amenities) is blocked.
  // Until approval, they can edit all fields ("edit anyone"). Admin can edit all fields at any time.
  const isApprovedListing = Boolean(
    editingId &&
    editingListing &&
    editingListing.status !== 'DRAFT' &&
    editingListing.status !== 'PENDING_APPROVAL'
  );
  const isSpecsBlocked = currentUser?.role !== 'ADMIN' && isApprovedListing;

  const loadListings = async () => {
    setLoading(true);
    try {
      // Sellers & Agents only load their own listings; Admin can view all listings
      const data = currentUser?.role === 'ADMIN'
        ? await api.getAllListings()
        : await api.getMyListings();
      // Ensure newest listings appear as the first card (descending ID)
      const sorted = (data || []).slice().sort((a, b) => (b.id || 0) - (a.id || 0));
      setListings(sorted);

      if (currentUser?.role === 'ADMIN') {
        const users = await api.getAllUsers().catch(() => []);
        setSellers((users || []).filter(u => u.role === 'SELLER' || u.role === 'ADMIN'));
        const allTxns = await api.getAllTransactions().catch(() => []);
        setSellerTransactions(allTxns || []);
      } else if (currentUser?.role === 'SELLER' || currentUser?.role === 'AGENT') {
        const myTxns = await api.getMyTransactions().catch(() => []);
        setSellerTransactions(myTxns || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionForListing = (listingId) => {
    return (sellerTransactions || []).find(t =>
      t.listing?.id === listingId &&
      (t.status === 'COMPLETED' || t.status === 'CONFIRMED' || t.status === 'PAYMENT_RECEIVED' || t.listing?.status === 'SOLD')
    );
  };

  const soldListings = listings.filter(l => l.status === 'SOLD' || (getTransactionForListing(l.id)?.status === 'COMPLETED' || getTransactionForListing(l.id)?.status === 'CONFIRMED'));
  const activeListings = listings.filter(l => !soldListings.some(s => s.id === l.id));

  const totalSoldRevenue = soldListings.reduce((sum, item) => {
    const txn = getTransactionForListing(item.id);
    return sum + (txn?.offerAmount ? txn.offerAmount : (item.price || 0));
  }, 0);

  useEffect(() => {
    loadListings();
  }, [currentUser]);

  const handleOpenCreate = () => {
    setEditingId(null);
    setEditingListing(null);
    setFormData({
      title: '',
      description: '',
      propertyType: 'Luxury Suite',
      price: 55000000,
      sizeSqft: 1650,
      bedrooms: 3,
      bathrooms: 2,
      address: '42 Galle Face Court',
      city: 'Colombo',
      district: 'Colombo 03',
      amenities: 'Infinity Pool, Inquiries Desk, Rooftop Bar, Underground Parking',
      imageUrl: '',
      status: 'DRAFT',
      sellerId: null
    });
    setImageInputMode('file');
    setModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item.id);
    setEditingListing(item);
    setFormData({
      title: item.title,
      description: item.description,
      propertyType: item.propertyType,
      price: item.price,
      sizeSqft: item.sizeSqft,
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      address: item.address,
      city: item.city,
      district: item.district || item.city,
      amenities: item.amenities || '',
      imageUrl: item.imageUrl || '',
      status: item.status,
      sellerId: item.seller?.id || null
    });
    setImageInputMode(item.imageUrl?.startsWith('data:') ? 'file' : 'url');
    setModalOpen(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      if (showToast) showToast('Image file size must be less than 12MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        imageUrl: event.target.result
      }));
      if (showToast) showToast(`Selected image: ${file.name}`);
    };
    reader.onerror = () => {
      if (showToast) showToast('Failed to read image file', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      if (showToast) showToast('Please attach a cover image for the residence', 'error');
      return;
    }
    try {
      if (editingId) {
        // If specifications are blocked by Admin approval, keep original specifications and only update title, description, imageUrl
        const payload = (isSpecsBlocked && editingListing)
          ? {
              ...editingListing,
              title: formData.title,
              description: formData.description,
              imageUrl: formData.imageUrl,
              agentId: editingListing.agent?.id || null,
              sellerId: editingListing.seller?.id || null
            }
          : formData;
        await api.updateListing(editingId, payload);
        if (showToast) {
          if (isSpecsBlocked) {
            showToast(`Listing "${formData.title}" updated successfully! (Title, Description & Image modified; specifications remained locked).`);
          } else {
            showToast(`Listing "${formData.title}" specifications updated successfully!`);
          }
        }
      } else {
        const payload = {
          ...formData,
          status: currentUser?.role === 'ADMIN' ? (formData.status || 'AVAILABLE') : 'DRAFT'
        };
        await api.createListing(payload);
        if (showToast) {
          if (currentUser?.role !== 'ADMIN') {
            showToast(`New property "${formData.title}" added as Draft! It will appear on homepage listings once Super Admin grants access.`);
          } else {
            showToast(`New property "${formData.title}" added successfully!`);
          }
        }
      }
      setModalOpen(false);
      loadListings();
    } catch (err) {
      if (showToast) showToast('Operation failed: ' + err.message, 'error');
    }
  };

  const handleStatusChange = async (id, title, newStatus) => {
    try {
      await api.updateListingStatus(id, newStatus);
      if (newStatus === 'AVAILABLE') {
        if (showToast) showToast(`Access granted for "${title}"! It is now live on homepage listings and seller/agent page.`);
      } else if (newStatus === 'REVOKED') {
        if (showToast) showToast(`Access revoked for "${title}". Hidden from homepage listings and shown as Revoked on seller/agent page.`);
      } else if (newStatus === 'DRAFT') {
        if (showToast) showToast(`Listing "${title}" set to Draft.`);
      } else {
        if (showToast) showToast(`Updated status of "${title}" to ${newStatus}`);
      }
      loadListings();
    } catch (err) {
      if (showToast) showToast('Status update failed: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id, title) => {
    const ok = confirmAction
      ? await confirmAction(`Are you sure you want to permanently remove "${title}"? This cannot be undone.`, { title: 'Delete listing' })
      : window.confirm(`Are you sure you want to permanently remove "${title}"?`);
    if (!ok) return;
    try {
      await api.deleteListing(id);
      if (showToast) showToast(`Removed property listing "${title}"`);
      loadListings();
    } catch (err) {
      if (showToast) showToast('Delete failed: ' + err.message, 'error');
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '36px 32px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', color: '#0f172a', marginBottom: '6px' }}>Property Management & Inventory</h1>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>
            Maintain active residential inventory, pricing schedules, unit specifications, and commercial availability.
          </p>
        </div>

        <button onClick={handleOpenCreate} className="btn-primary" style={{ padding: '12px 22px' }}>
          <Plus size={18} /> Add New Property
        </button>
      </div>

      {/* View Switcher: Active Inventory vs Sold Apartments History */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
        <button
          type="button"
          onClick={() => setInventoryTab('ACTIVE')}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: inventoryTab === 'ACTIVE' ? '2px solid #0f294a' : '1px solid #cbd5e1',
            background: inventoryTab === 'ACTIVE' ? '#0f294a' : '#ffffff',
            color: inventoryTab === 'ACTIVE' ? '#ffffff' : '#334155',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Building size={16} /> Active & Listed Inventory ({activeListings.length})
        </button>

        <button
          type="button"
          onClick={() => setInventoryTab('SOLD')}
          style={{
            padding: '9px 18px',
            borderRadius: '8px',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: inventoryTab === 'SOLD' ? '2px solid #15803d' : '1px solid #bbf7d0',
            background: inventoryTab === 'SOLD' ? '#15803d' : '#f0fdf4',
            color: inventoryTab === 'SOLD' ? '#ffffff' : '#15803d',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Award size={16} /> 🏆 Sold Apartments History ({soldListings.length})
        </button>
      </div>

      {/* ACTIVE INVENTORY VIEW */}
      {inventoryTab === 'ACTIVE' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#64748b' }}>Loading inventory catalog...</div>
          ) : activeListings.length === 0 ? (
            <div className="clean-card" style={{ textAlign: 'center', padding: '60px' }}>
              <AlertCircle size={40} color="#d97706" style={{ marginBottom: '12px' }} />
              <h3 style={{ color: '#0f172a', marginBottom: '6px' }}>No Active Inventory Found</h3>
              <p style={{ color: '#64748b' }}>Click "Add New Property" to publish your first residential listing.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
              {activeListings.map((item) => (
            <div key={item.id} className="clean-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }}>
              {/* Photo & Tag */}
              <div style={{ position: 'relative', height: '165px', backgroundColor: '#e2e8f0' }}>
                <img
                  src={item.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'}
                  alt={item.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'; }}
                />
                <div style={{ position: 'absolute', top: '8px', left: '8px' }}>
                  {item.status === 'DRAFT' || item.status === 'PENDING_APPROVAL' ? (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fcd34d',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}
                      title="Draft: Automatically draft until grant access from Super Admin"
                    >
                      <Clock size={11} /> DRAFT • PENDING ADMIN ACCESS
                    </span>
                  ) : item.status === 'AVAILABLE' ? (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}
                      title="Access granted: Live on homepage listings"
                    >
                      <CheckCircle2 size={11} /> AVAILABLE • ACCESS GRANTED
                    </span>
                  ) : item.status === 'REVOKED' ? (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        border: '1px solid #fca5a5',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}
                      title="Revoked by Super Admin: Nothing on homepage listings"
                    >
                      <XCircle size={11} /> REVOKED
                    </span>
                  ) : item.status === 'RESERVED' ? (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        border: '1px solid #fcd34d',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      <Clock size={11} /> RESERVED
                    </span>
                  ) : item.status === 'SOLD' ? (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: '#ecfdf5',
                        color: '#065f46',
                        border: '1px solid #a7f3d0',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        padding: '3px 8px',
                        borderRadius: '6px'
                      }}
                    >
                      <CheckCircle2 size={11} /> SOLD
                    </span>
                  ) : (
                    <span className="badge badge-available" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                      {item.status}
                    </span>
                  )}
                </div>
                <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(15, 23, 42, 0.85)', padding: '2px 8px', borderRadius: '5px', fontSize: '0.7rem', color: '#ffffff', fontWeight: 600 }}>
                  {item.propertyType}
                </div>
              </div>

              {/* Information Body */}
              <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>
                  <MapPin size={13} /> {item.city} • {item.district}
                </div>

                <h3 style={{ fontSize: '1.02rem', color: '#0f172a', marginBottom: '4px', lineHeight: 1.25, fontWeight: 800 }}>{item.title}</h3>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {item.agent && item.seller && item.agent.id === item.seller.id && item.agent.role === 'AGENT' ? (
                    <span>Agent: <strong style={{ color: '#0f294a' }}>{item.agent.fullName}</strong></span>
                  ) : (
                    <>
                      {item.seller && <span>Seller: <strong style={{ color: '#0f294a' }}>{item.seller.fullName}</strong></span>}
                      {item.agent && <span>Agent: <strong style={{ color: '#0f294a' }}>{item.agent.fullName}</strong></span>}
                    </>
                  )}
                </div>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '10px', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }}>
                  {item.description}
                </p>

                {/* Specs */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: '10px', color: '#475569', fontSize: '0.76rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Bed size={13} /> {item.bedrooms} Beds</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Bath size={13} /> {item.bathrooms} Baths</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Maximize2 size={13} /> {item.sizeSqft?.toLocaleString()} sq.ft</span>
                </div>

                {/* Price & Status Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</span>
                    <h4 style={{ fontSize: '1.15rem', color: '#0f294a', fontWeight: 800, margin: '2px 0' }}>LKR {item.price?.toLocaleString()}</h4>
                  </div>

                  {/* Status Display: Super Admin has full control; Sellers view their status */}
                  {currentUser?.role === 'ADMIN' ? (
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, item.title, e.target.value)}
                      style={{ fontSize: '0.82rem', padding: '6px 10px', borderRadius: '8px', fontWeight: 700 }}
                    >
                      <option value="AVAILABLE">Available (Grant Access)</option>
                      <option value="DRAFT">Draft</option>
                      <option value="REVOKED">Revoked (Revoke)</option>
                      <option value="RESERVED">Reserved</option>
                      <option value="SOLD">Sold</option>
                    </select>
                  ) : item.status === 'REVOKED' ? (
                    <span style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: '1px solid #fca5a5',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <XCircle size={12} /> Revoked
                    </span>
                  ) : item.status === 'AVAILABLE' ? (
                    <span style={{
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      backgroundColor: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle2 size={12} /> Available
                    </span>
                  ) : item.status === 'RESERVED' ? (
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fcd34d',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={12} /> Reserved (Buyer Active)
                    </span>
                  ) : item.status === 'SOLD' ? (
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      backgroundColor: '#ecfdf5',
                      color: '#065f46',
                      border: '1px solid #a7f3d0',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <CheckCircle2 size={12} /> Sold (Complete)
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fcd34d',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Clock size={12} /> Draft
                    </span>
                  )}
                </div>

                {/* Status Explanation Banner */}
                {(item.status === 'DRAFT' || item.status === 'PENDING_APPROVAL') && (
                  <div style={{
                    background: '#fffbeb',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '10px'
                  }}>
                    <Clock size={12} style={{ flexShrink: 0, color: '#d97706' }} />
                    <span>Draft: Awaiting Super Admin to grant access before appearing on homepage listings</span>
                  </div>
                )}
                {item.status === 'REVOKED' && (
                  <div style={{
                    background: '#fef2f2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '10px'
                  }}>
                    <XCircle size={12} style={{ flexShrink: 0, color: '#dc2626' }} />
                    <span>Access Revoked by Super Admin • Hidden from homepage listings</span>
                  </div>
                )}
                {item.status === 'AVAILABLE' && (
                  <div style={{
                    background: '#f0fdf4',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    padding: '5px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '10px'
                  }}>
                    <CheckCircle2 size={12} style={{ flexShrink: 0, color: '#16a34a' }} />
                    <span>Access granted by Super Admin • Live on homepage listings</span>
                  </div>
                )}

                {/* Actions: Frozen if under contract (RESERVED or SOLD) */}
                <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                  {(item.status === 'RESERVED' || item.status === 'SOLD') && currentUser?.role !== 'ADMIN' ? (
                    <>
                      <button
                        type="button"
                        disabled
                        title="Property specifications and price are legally frozen while under active reservation or purchase agreement."
                        style={{
                          flex: 1,
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          padding: '9px',
                          background: '#f8fafc',
                          color: '#64748b',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          cursor: 'not-allowed',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Lock size={13} color="#94a3b8" /> Specs Frozen (Under Contract)
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Cannot delete property with active buyer reservation or completed sale."
                        style={{
                          padding: '9px 14px',
                          background: '#f8fafc',
                          color: '#cbd5e1',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          cursor: 'not-allowed'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="btn-secondary"
                        style={{
                          flex: 1,
                          fontSize: '0.84rem',
                          padding: '9px 12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: 700
                        }}
                        title={
                          currentUser?.role !== 'ADMIN' && item.status !== 'DRAFT' && item.status !== 'PENDING_APPROVAL'
                            ? 'Super Admin has approved this residence. Specifications are locked; you can only edit Title name, Description, and Cover Image.'
                            : 'Draft: Full editing access to all specifications, dimensions, location, and pricing prior to Admin approval.'
                        }
                      >
                        {currentUser?.role !== 'ADMIN' && item.status !== 'DRAFT' && item.status !== 'PENDING_APPROVAL' ? (
                          <>
                            <Edit2 size={14} color="#0f294a" /> Edit Details (Specs Locked)
                          </>
                        ) : (
                          <>
                            <Edit2 size={14} /> Edit Specifications
                          </>
                        )}
                      </button>
                      <button onClick={() => handleDelete(item.id, item.title)} className="btn-danger" style={{ padding: '9px 14px' }} title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )}

      {/* SOLD APARTMENTS HISTORY VIEW */}
      {inventoryTab === 'SOLD' && (
        <div>
          {/* Executive Sold Performance Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
            borderRadius: '12px',
            padding: '24px 28px',
            color: '#ffffff',
            marginBottom: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px',
            boxShadow: '0 4px 14px rgba(6, 78, 59, 0.15)'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Award size={22} color="#fcd34d" />
                <h3 style={{ fontSize: '1.35rem', margin: 0, fontWeight: 800 }}>Sold Apartments Ledger</h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#a7f3d0' }}>
                Official commercial record of your apartments purchased by verified buyers with confirmed financial settlements.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(255,255,255,0.12)', padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#a7f3d0', fontWeight: 700 }}>Total Units Sold</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{soldListings.length} Residences</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.12)', padding: '10px 18px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#a7f3d0', fontWeight: 700 }}>Realized Sales Value</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>LKR {totalSoldRevenue.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#64748b' }}>Loading sold history catalog...</div>
          ) : soldListings.length === 0 ? (
            <div className="clean-card" style={{ textAlign: 'center', padding: '60px' }}>
              <Award size={48} color="#15803d" style={{ marginBottom: '14px' }} />
              <h3 style={{ color: '#0f172a', marginBottom: '6px', fontSize: '1.25rem' }}>No Sold Apartments Yet</h3>
              <p style={{ color: '#64748b', maxWidth: '520px', margin: '0 auto 18px', fontSize: '0.9rem', lineHeight: 1.5 }}>
                When a buyer reserves and completes settlement on any of your listed residences, the property will automatically appear here with the buyer's full name, email, transaction invoice, and settlement details.
              </p>
              <button onClick={() => setInventoryTab('ACTIVE')} className="btn-secondary">
                View Active Inventory
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {soldListings.map((item) => {
                const txn = getTransactionForListing(item.id);
                const soldPrice = txn?.offerAmount ? txn.offerAmount : item.price;
                const buyerName = txn?.buyer?.fullName || 'Verified Buyer';
                const buyerEmail = txn?.buyer?.email || 'N/A';
                const invoiceNo = txn?.invoiceNumber || txn?.invoiceNo || `INV-${txn?.id || item.id}`;
                const settledDate = txn?.paymentDate || txn?.updatedAt || item.updatedAt;

                return (
                  <div key={item.id} className="clean-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #bbf7d0', boxShadow: '0 2px 8px rgba(22, 101, 52, 0.08)' }}>
                    {/* Photo with Sold Badge */}
                    <div style={{ position: 'relative', height: '175px', backgroundColor: '#e2e8f0' }}>
                      <img
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'; }}
                      />
                      <div style={{ position: 'absolute', top: '10px', left: '10px' }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: '#15803d',
                            color: '#ffffff',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: 800,
                            fontSize: '0.74rem',
                            padding: '4px 10px',
                            borderRadius: '6px'
                          }}
                        >
                          <CheckCircle2 size={13} /> 🏆 SOLD • TITLE DEED CONVEYED
                        </span>
                      </div>
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(15, 23, 42, 0.85)', padding: '2px 8px', borderRadius: '5px', fontSize: '0.7rem', color: '#ffffff', fontWeight: 600 }}>
                        {item.propertyType}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d97706', fontSize: '0.76rem', fontWeight: 700, marginBottom: '4px' }}>
                        <MapPin size={13} /> {item.city} • {item.district}
                      </div>
                      <h3 style={{ fontSize: '1.08rem', color: '#0f172a', marginBottom: '6px', lineHeight: 1.25, fontWeight: 800 }}>{item.title}</h3>

                      {/* Specs */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', marginBottom: '12px', color: '#475569', fontSize: '0.76rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Bed size={13} /> {item.bedrooms} Beds</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Bath size={13} /> {item.bathrooms} Baths</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Maximize2 size={13} /> {item.sizeSqft?.toLocaleString()} sq.ft</span>
                      </div>

                      {/* Realized Settlement Box */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Sold Price (Settled)</span>
                          <span style={{ fontSize: '1.18rem', color: '#15803d', fontWeight: 800 }}>LKR {soldPrice.toLocaleString()}</span>
                        </div>

                        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', fontSize: '0.78rem', color: '#334155' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                            <UserIcon size={12} color="#0f294a" />
                            <span>Buyer: <strong style={{ color: '#0f172a' }}>{buyerName}</strong></span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginLeft: '18px', marginBottom: '4px' }}>
                            {buyerEmail}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.74rem' }}>
                            <Receipt size={12} color="#15803d" />
                            <span>Invoice: <strong>{invoiceNo}</strong></span>
                            {settledDate && (
                              <span style={{ marginLeft: 'auto', color: '#64748b' }}>
                                {new Date(settledDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Invoice / Deed View Button */}
                      <div style={{ marginTop: 'auto' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedSoldInvoice({ listing: item, txn, soldPrice, buyerName, buyerEmail, invoiceNo, settledDate })}
                          className="btn-secondary"
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '9px',
                            fontSize: '0.84rem',
                            fontWeight: 700,
                            borderColor: '#86efac',
                            color: '#15803d',
                            background: '#f0fdf4'
                          }}
                        >
                          <Receipt size={14} /> View Settlement Receipt & Deed
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT PROPERTY MODAL */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', width: '100%' }}>
            <button
              onClick={() => setModalOpen(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.4rem', color: '#0f172a', marginBottom: '6px' }}>
              {editingId ? 'Edit Property Listing' : 'Publish New Residence'}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: '20px' }}>
              Configure property specifications, location details, pricing, and amenities.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* EDITABLE FIELD 1: TITLE NAME */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Property Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%' }}
                  placeholder="e.g. Marina Bay Sands Residence - Colombo 03"
                />
              </div>

              {/* EDITABLE FIELD 2: COVER IMAGE (CHANGE IMAGE) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', margin: 0 }}>
                    Residence Cover Image *
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('file')}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: '4px',
                        border: '1px solid ' + (imageInputMode === 'file' ? '#0f294a' : '#cbd5e1'),
                        background: imageInputMode === 'file' ? '#0f294a' : '#ffffff',
                        color: imageInputMode === 'file' ? '#ffffff' : '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      Local File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        borderRadius: '4px',
                        border: '1px solid ' + (imageInputMode === 'url' ? '#0f294a' : '#cbd5e1'),
                        background: imageInputMode === 'url' ? '#0f294a' : '#ffffff',
                        color: imageInputMode === 'url' ? '#ffffff' : '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      Web URL
                    </button>
                  </div>
                </div>

                {formData.imageUrl ? (
                  <div style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <img
                      src={formData.imageUrl}
                      alt="Cover Preview"
                      style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '6px', backgroundColor: '#e2e8f0' }}
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>Image Attached</div>
                      <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>Ready for verification upload</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      style={{
                        background: '#fee2e2',
                        color: '#b91c1c',
                        border: '1px solid #fca5a5',
                        borderRadius: '6px',
                        padding: '5px 10px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Select a different image"
                    >
                      <X size={13} /> Change Image
                    </button>
                  </div>
                ) : imageInputMode === 'file' ? (
                  <div>
                    <label
                      htmlFor="seller-image-file-input"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px 16px',
                        border: '2px dashed #cbd5e1',
                        borderRadius: '10px',
                        backgroundColor: '#f8fafc',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'border-color 0.15s, background-color 0.15s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0f294a'; e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
                    >
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                        <UploadCloud size={22} color="#2563eb" />
                      </div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                        Click to select image file from your device
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        Supports JPG, PNG, WEBP local images (up to 12MB)
                      </span>
                    </label>
                    <input
                      id="seller-image-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                ) : (
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    style={{ width: '100%' }}
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                )}
              </div>

              {/* DESCRIPTION */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Marketing Description
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%' }}
                  placeholder="Highlight key luxury finishes, views, and lifestyle amenities..."
                />
              </div>

              {/* SPECIFICATIONS BLOCK (Displayed only when editable / pre-approval draft or Admin) */}
              {!isSpecsBlocked && (
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                  background: '#ffffff',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                    <Building size={16} color="#0f294a" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                      Property Specifications
                    </span>
                  </div>

                  {currentUser?.role === 'ADMIN' && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f294a', marginBottom: '4px' }}>
                        Assigned Seller / Developer *
                      </label>
                      <select
                        value={formData.sellerId || ''}
                        onChange={(e) => setFormData({ ...formData, sellerId: e.target.value ? Number(e.target.value) : null })}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      >
                        <option value="">-- Assign Seller / Developer (Defaults to You if empty) --</option>
                        {sellers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName} ({s.role}) — {s.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Property Type
                      </label>
                      <select
                        value={formData.propertyType}
                        onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                        style={{ width: '100%' }}
                      >
                        <option value="Luxury Suite">Luxury Suite</option>
                        <option value="Penthouse">Penthouse</option>
                        <option value="Standard Apartment">Standard Apartment</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Status
                      </label>
                      {currentUser?.role === 'ADMIN' ? (
                        <select
                          value={formData.status || 'AVAILABLE'}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          style={{ width: '100%', fontWeight: 600 }}
                        >
                          <option value="AVAILABLE">Available (Grant Access • Live)</option>
                          <option value="DRAFT">Draft</option>
                          <option value="REVOKED">Revoked (Access Revoked)</option>
                          <option value="RESERVED">Reserved</option>
                          <option value="SOLD">Sold</option>
                        </select>
                      ) : (
                        <div style={{
                          padding: '8px 12px',
                          background: formData.status === 'AVAILABLE' ? '#ecfdf5' : formData.status === 'REVOKED' ? '#fef2f2' : '#fffbeb',
                          border: `1px solid ${formData.status === 'AVAILABLE' ? '#a7f3d0' : formData.status === 'REVOKED' ? '#fecaca' : '#fde68a'}`,
                          borderRadius: '8px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: formData.status === 'AVAILABLE' ? '#065f46' : formData.status === 'REVOKED' ? '#991b1b' : '#92400e',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {formData.status === 'AVAILABLE' ? (
                            <>
                              <CheckCircle2 size={14} color="#16a34a" /> Available (Access Granted by Super Admin)
                            </>
                          ) : formData.status === 'REVOKED' ? (
                            <>
                              <XCircle size={14} color="#dc2626" /> Revoked (Access Revoked by Super Admin)
                            </>
                          ) : (
                            <>
                              <Clock size={14} color="#d97706" /> Draft (Pending Super Admin Grant Access)
                            </>
                          )}
                        </div>
                      )}
                      <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                        {currentUser?.role === 'ADMIN'
                          ? 'Super Admin can grant access or revoke apartment status.'
                          : 'New apartments automatically start in Draft until Super Admin grants access.'}
                      </span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Price (LKR) *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Floor Area (sq.ft) *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.sizeSqft}
                        onChange={(e) => setFormData({ ...formData, sizeSqft: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Bedrooms *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.bedrooms}
                        onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Bathrooms *
                      </label>
                      <input
                        type="number"
                        required
                        value={formData.bathrooms}
                        onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        City *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        style={{ width: '100%' }}
                        placeholder="Colombo"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        District / Area *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        style={{ width: '100%' }}
                        placeholder="Colombo 03"
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      style={{ width: '100%' }}
                      placeholder="e.g. 50 Galle Road, Kollupitiya"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                      Amenities & Facilities
                    </label>
                    <input
                      type="text"
                      value={formData.amenities}
                      onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                      style={{ width: '100%' }}
                      placeholder="e.g. Infinity Pool, Gym, 24/7 Security, Covered Parking"
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Save Changes' : 'Publish Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SELLER SOLD SETTLEMENT INVOICE & TITLE DEED MODAL */}
      {selectedSoldInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedSoldInvoice(null)}>
          <div className="modal-content" style={{ maxWidth: '600px', width: '100%', maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedSoldInvoice(null)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Award size={26} />
              </div>
              <h2 style={{ fontSize: '1.4rem', color: '#0f172a', margin: '0 0 4px', fontWeight: 800 }}>Official Settlement Receipt & Deed</h2>
              <p style={{ color: '#64748b', fontSize: '0.84rem', margin: 0 }}>
                Reference: <strong style={{ color: '#0f294a' }}>{selectedSoldInvoice.invoiceNo}</strong> • Status: <strong style={{ color: '#15803d' }}>SOLD & SETTLED</strong>
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '18px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Property Sold</span>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.96rem', marginTop: '2px' }}>{selectedSoldInvoice.listing.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{selectedSoldInvoice.listing.address}, {selectedSoldInvoice.listing.city}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Purchaser (Buyer)</span>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.96rem', marginTop: '2px' }}>{selectedSoldInvoice.buyerName}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{selectedSoldInvoice.buyerEmail}</div>
              </div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>Agreed Acquisition Amount</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                      LKR {selectedSoldInvoice.soldPrice.toLocaleString()}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>Payment Strategy / Terms</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {selectedSoldInvoice.txn?.pricingPlan || 'Standard Settlement'}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff' }}>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>Settlement Date</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                      {selectedSoldInvoice.settledDate ? new Date(selectedSoldInvoice.settledDate).toLocaleDateString() : 'Confirmed'}
                    </td>
                  </tr>
                  <tr style={{ background: '#f0fdf4' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 800, color: '#166534' }}>Total Realized (Settlement Value)</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 800, color: '#15803d', fontSize: '1.1rem' }}>
                      LKR {selectedSoldInvoice.soldPrice.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedSoldInvoice(null)}
                className="btn-primary"
                style={{ padding: '9px 24px' }}
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
