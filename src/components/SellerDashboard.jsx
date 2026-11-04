import React, { useState, useEffect } from 'react';
import {
  Building2,
  PlusCircle,
  Eye,
  Edit2,
  Trash2,
  Globe,
  EyeOff,
  LayoutDashboard,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
  FileText,
  Tag,
  CheckCircle2,
  RotateCcw,
  Check,
} from 'lucide-react';

export default function SellerDashboard({
  user,
  onOpenAddProperty,
  onOpenMyListings,
  onSelectProperty,
  onEditProperty,
  onListingChanged,
}) {
  const [stats, setStats] = useState(null);
  const [recentListings, setRecentListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [soldConfirmProperty, setSoldConfirmProperty] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('landai_token');
      const res = await fetch('/api/seller/dashboard', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load dashboard');
      const data = await res.json();
      setStats(data.stats);
      setRecentListings(data.recent_listings || []);
    } catch (err) {
      setError(err.message || 'Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (propertyId, newStatus) => {
    setStatusUpdating(true);
    try {
      const token = localStorage.getItem('landai_token');
      const res = await fetch(`/api/properties/${propertyId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setActionFeedback(
          newStatus === 'SOLD'
            ? 'Property marked as SOLD successfully.'
            : `Property status set to ${newStatus}.`
        );
        setTimeout(() => setActionFeedback(''), 3500);
        setSoldConfirmProperty(null);
        fetchDashboard();
        if (onListingChanged) onListingChanged();
      }
    } catch (err) {
      console.error('Status change failed:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const formatInr = (amount) => {
    if (!amount) return '₹0';
    const num = Number(amount);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  return (
    <div className="seller-dashboard-page animate-fade">
      {/* Header */}
      <div className="seller-page-header">
        <div className="seller-header-text">
          <div className="hero-eyebrow">
            <span className="eyebrow-pill">SELLER PORTAL</span>
            <span className="eyebrow-note">PROPERTY INVENTORY &amp; TELEMETRY</span>
          </div>
          <h1>Seller Overview &amp; Control Center</h1>
          <p className="seller-header-sub">
            Track performance, update parcel availability status, and manage real-time marketplace listings.
          </p>
        </div>
        <div className="seller-header-badge">
          <Building2 size={16} />
          <span>Seller Account</span>
        </div>
      </div>

      {actionFeedback && (
        <div className="seller-feedback-banner">
          <CheckCircle2 size={16} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Loading & Error */}
      {loading ? (
        <div className="seller-loading-state">
          <RefreshCw size={24} className="spin-icon" />
          <span>Loading dashboard insights…</span>
        </div>
      ) : error ? (
        <div className="seller-error-state">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={fetchDashboard} className="seller-retry-btn">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="seller-stats-grid">
            <div className="seller-stat-card">
              <div className="stat-icon-wrap">
                <Building2 size={18} />
              </div>
              <div className="stat-details">
                <span className="stat-number">{stats?.total ?? 0}</span>
                <span className="stat-label">Total Listings</span>
              </div>
            </div>

            <div className="seller-stat-card">
              <div className="stat-icon-wrap" style={{ background: '#ECFDF5', color: '#047857' }}>
                <Check size={18} />
              </div>
              <div className="stat-details">
                <span className="stat-number">{stats?.available ?? 0}</span>
                <span className="stat-label">Available for Sale</span>
              </div>
            </div>

            <div className="seller-stat-card">
              <div className="stat-icon-wrap" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
                <Tag size={18} />
              </div>
              <div className="stat-details">
                <span className="stat-number">{stats?.sold ?? 0}</span>
                <span className="stat-label">Sold Properties</span>
              </div>
            </div>

            <div className="seller-stat-card">
              <div className="stat-icon-wrap" style={{ background: '#FEF3C7', color: '#B45309' }}>
                <Eye size={18} />
              </div>
              <div className="stat-details">
                <span className="stat-number">{stats?.pending_sale ?? 0}</span>
                <span className="stat-label">Pending Sales</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="seller-quick-actions">
            <button
              className="seller-action-chip primary"
              onClick={onOpenAddProperty}
              id="action-add-listing"
            >
              <PlusCircle size={15} />
              <span>Add New Listing</span>
            </button>
            <button
              className="seller-action-chip"
              onClick={onOpenMyListings}
              id="action-manage-listings"
            >
              <LayoutDashboard size={15} />
              <span>Manage All Inventory</span>
            </button>
          </div>

          {/* Recent Listings Table */}
          <div className="seller-recent-section">
            <div className="seller-section-header">
              <h2>Recent Listings &amp; Status Management</h2>
              <button className="seller-view-all-btn" onClick={onOpenMyListings}>
                View All <ChevronRight size={13} />
              </button>
            </div>

            {recentListings.length === 0 ? (
              <div className="seller-empty-state">
                <div className="seller-empty-icon">
                  <Building2 size={32} />
                </div>
                <h3>No listings yet</h3>
                <p>You haven't listed any properties. Add your first property to get started.</p>
                <button className="seller-cta-btn" onClick={onOpenAddProperty}>
                  <PlusCircle size={15} />
                  <span>Add Your First Property</span>
                </button>
              </div>
            ) : (
              <div className="seller-listings-table">
                <div className="seller-table-header">
                  <span>Property</span>
                  <span>Price</span>
                  <span>Availability</span>
                  <span>Actions</span>
                </div>
                {recentListings.map((listing) => {
                  const isSold = listing.status === 'SOLD';
                  const isPending = listing.status === 'PENDING';

                  return (
                    <div key={listing.id} className="seller-table-row">
                      <div className="seller-listing-info">
                        <div className="seller-listing-thumb">
                          <img src={listing.image} alt={listing.title} />
                        </div>
                        <div>
                          <strong>{listing.title}</strong>
                          <span>{listing.address || listing.location}</span>
                        </div>
                      </div>
                      <div className="seller-listing-price">{formatInr(listing.price)}</div>
                      <div>
                        {isSold ? (
                          <span className="mlc-status-badge status-sold-pill">SOLD</span>
                        ) : isPending ? (
                          <span className="mlc-status-badge status-pending-pill">PENDING</span>
                        ) : (
                          <span className="mlc-status-badge status-available-pill">AVAILABLE</span>
                        )}
                      </div>
                      <div className="seller-listing-actions">
                        <button
                          className="seller-icon-btn"
                          onClick={() => onSelectProperty && onSelectProperty(listing)}
                          title="Preview listing"
                        >
                          <Eye size={14} />
                        </button>
                        {!listing.is_sample && (
                          <button
                            className="seller-icon-btn"
                            onClick={() => onEditProperty && onEditProperty(listing)}
                            title="Edit listing"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {!listing.is_sample && (
                          <>
                            {!isSold ? (
                              <button
                                className="seller-icon-btn"
                                style={{ color: '#DC2626' }}
                                onClick={() => setSoldConfirmProperty(listing)}
                                title="Mark as SOLD"
                              >
                                <Tag size={14} />
                              </button>
                            ) : (
                              <button
                                className="seller-icon-btn"
                                style={{ color: '#059669' }}
                                onClick={() => handleStatusChange(listing.id, 'AVAILABLE')}
                                title="Mark as AVAILABLE"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Confirmation Dialog: Mark as Sold */}
      {soldConfirmProperty && (
        <div className="delete-confirm-overlay" role="dialog" aria-modal="true">
          <div className="delete-confirm-dialog">
            <div
              className="delete-confirm-icon"
              style={{ background: '#FEE2E2', color: '#DC2626' }}
            >
              <Tag size={24} />
            </div>
            <h3>Mark Property as SOLD?</h3>
            <p>
              Are you sure you want to mark{' '}
              <strong>"{soldConfirmProperty.title}"</strong> as <strong>SOLD</strong>?
              <br />
              <br />
              This updates the property status to SOLD in the database and removes it from active
              buyer searches.
            </p>
            <div className="delete-confirm-actions">
              <button
                className="delete-cancel-btn"
                onClick={() => setSoldConfirmProperty(null)}
                disabled={statusUpdating}
              >
                Cancel
              </button>
              <button
                className="delete-confirm-btn"
                style={{ background: '#111111', color: '#FFFFFF' }}
                onClick={() => handleStatusChange(soldConfirmProperty.id, 'SOLD')}
                disabled={statusUpdating}
              >
                {statusUpdating ? 'Updating…' : 'Yes, Confirm SOLD'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
