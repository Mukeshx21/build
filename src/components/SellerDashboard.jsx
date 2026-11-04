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
  FileText
} from 'lucide-react';

export default function SellerDashboard({
  user,
  onOpenAddProperty,
  onOpenMyListings,
  onSelectProperty,
  onEditProperty,
}) {
  const [stats, setStats] = useState(null);
  const [recentListings, setRecentListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    try {
      const token = localStorage.getItem('landai_token');
      const res = await fetch(`/api/properties/${propertyId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ listing_status: newStatus }),
      });
      if (res.ok) {
        fetchDashboard();
      }
    } catch (err) {
      console.error('Status change failed:', err);
    }
  };

  const formatInr = (amount) => {
    if (!amount) return '₹0';
    const num = Number(amount);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const getStatusClass = (status) => {
    const map = {
      'Published': 'status-published',
      'Draft': 'status-draft',
      'Pending Review': 'status-pending',
      'Unpublished': 'status-unpublished',
      'Rejected': 'status-rejected',
    };
    return map[status] || 'status-draft';
  };

  return (
    <div className="seller-dashboard-page animate-fade">
      {/* Header */}
      <div className="seller-page-header">
        <div className="seller-header-text">
          <div className="hero-eyebrow">
            <span className="eyebrow-pill">SELLER PORTAL</span>
            <span className="eyebrow-note">PROPERTY MANAGEMENT</span>
          </div>
          <h1>Welcome back, {user?.name?.split(' ')[0] || 'Seller'}</h1>
          <p className="seller-header-sub">
            Manage your property listings, track visibility, and connect with buyers.
          </p>
        </div>
        <button
          className="seller-cta-btn"
          onClick={onOpenAddProperty}
          id="seller-add-property-btn"
        >
          <PlusCircle size={16} />
          <span>Add New Property</span>
        </button>
      </div>

      {loading ? (
        <div className="seller-loading-state">
          <RefreshCw size={24} className="spin-icon" />
          <span>Loading your dashboard…</span>
        </div>
      ) : error ? (
        <div className="seller-error-state">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={fetchDashboard} className="seller-retry-btn">Retry</button>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="seller-stats-grid">
            <div className="seller-stat-card" id="stat-total">
              <div className="stat-icon-wrap">
                <Building2 size={18} />
              </div>
              <div className="stat-details">
                <span className="stat-number">{stats?.total ?? 0}</span>
                <span className="stat-label">Total Listings</span>
              </div>
            </div>
            <div className="seller-stat-card" id="stat-published">
              <div className="stat-icon-wrap">
                <Globe size={18} />
              </div>
              <div className="stat-details">
                <span className="stat-number">{stats?.published ?? 0}</span>
                <span className="stat-label">Published</span>
              </div>
            </div>
            <div className="seller-stat-card" id="stat-draft">
              <div className="stat-icon-wrap">
                <FileText size={18} />
              </div>
              <div className="stat-details">
                <span className="stat-number">{stats?.draft ?? 0}</span>
                <span className="stat-label">Drafts</span>
              </div>
            </div>
            <div className="seller-stat-card" id="stat-pending">
              <div className="stat-icon-wrap">
                <Eye size={18} />
              </div>
              <div className="stat-details">
                <span className="stat-number">{stats?.pending_review ?? 0}</span>
                <span className="stat-label">Pending Review</span>
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
              <span>Manage All Listings</span>
            </button>
          </div>

          {/* Recent Listings */}
          <div className="seller-recent-section">
            <div className="seller-section-header">
              <h2>Recent Listings</h2>
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
                <button
                  className="seller-cta-btn"
                  onClick={onOpenAddProperty}
                  id="empty-add-property-btn"
                >
                  <PlusCircle size={15} />
                  <span>Add Your First Property</span>
                </button>
              </div>
            ) : (
              <div className="seller-listings-table">
                <div className="seller-table-header">
                  <span>Property</span>
                  <span>Price</span>
                  <span>Status</span>
                  <span>Actions</span>
                </div>
                {recentListings.map((listing) => (
                  <div key={listing.id} className="seller-table-row">
                    <div className="seller-listing-info">
                      <div className="seller-listing-thumb">
                        <img src={listing.image} alt={listing.title} />
                      </div>
                      <div>
                        <strong>{listing.title}</strong>
                        <span>{listing.location}</span>
                      </div>
                    </div>
                    <div className="seller-listing-price">{formatInr(listing.price)}</div>
                    <div>
                      <span className={`seller-status-badge ${getStatusClass(listing.listing_status)}`}>
                        {listing.listing_status || 'Published'}
                      </span>
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
                      {listing.listing_status === 'Published' ? (
                        <button
                          className="seller-icon-btn"
                          onClick={() => handleStatusChange(listing.id, 'Unpublished')}
                          title="Unpublish listing"
                        >
                          <EyeOff size={14} />
                        </button>
                      ) : listing.listing_status === 'Draft' || listing.listing_status === 'Unpublished' ? (
                        <button
                          className="seller-icon-btn"
                          onClick={() => handleStatusChange(listing.id, 'Published')}
                          title="Publish listing"
                        >
                          <Globe size={14} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
