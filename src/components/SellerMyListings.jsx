import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Globe,
  EyeOff,
  FileText,
  AlertCircle,
  X,
  ChevronDown,
  ArrowUpDown,
  Building2,
  MapPin,
  Maximize2
} from 'lucide-react';

const STATUS_OPTIONS = ['', 'Draft', 'Published', 'Unpublished', 'Pending Review', 'Rejected'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const STATUS_LABELS = {
  Published: { cls: 'status-published', label: 'Published' },
  Draft: { cls: 'status-draft', label: 'Draft' },
  'Pending Review': { cls: 'status-pending', label: 'Pending Review' },
  Unpublished: { cls: 'status-unpublished', label: 'Unpublished' },
  Rejected: { cls: 'status-rejected', label: 'Rejected' },
};

export default function SellerMyListings({ user, onSelectProperty, onEditProperty }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  useEffect(() => {
    fetchListings();
  }, [query, statusFilter, sort]);

  const fetchListings = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('landai_token');
      const params = new URLSearchParams({ sort });
      if (query.trim()) params.set('q', query.trim());
      if (statusFilter) params.set('listing_status', statusFilter);

      const res = await fetch(`/api/seller/listings?${params}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load listings');
      const data = await res.json();
      setListings(data.properties || []);
    } catch (err) {
      setError(err.message || 'Could not load your listings.');
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
      if (!res.ok) throw new Error('Could not update status');
      setActionFeedback(`Listing status changed to ${newStatus}.`);
      setTimeout(() => setActionFeedback(''), 3000);
      fetchListings();
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('landai_token');
      const res = await fetch(`/api/properties/${deleteId}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Could not delete listing');
      setDeleteId(null);
      setActionFeedback('Listing deleted successfully.');
      setTimeout(() => setActionFeedback(''), 3000);
      fetchListings();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatInr = (amount) => {
    if (!amount) return '₹0';
    const num = Number(amount);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const formatDate = (dt) => {
    if (!dt) return '';
    return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="my-listings-page animate-fade">
      {/* Header */}
      <div className="seller-page-header">
        <div className="seller-header-text">
          <div className="hero-eyebrow">
            <span className="eyebrow-pill">SELLER PORTAL</span>
            <span className="eyebrow-note">MY LISTINGS</span>
          </div>
          <h1>My Property Listings</h1>
          <p className="seller-header-sub">
            Search, filter, and manage all your property listings. Only Published listings appear in the public marketplace.
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {actionFeedback && (
        <div className="seller-feedback-banner">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback('')}><X size={13} /></button>
        </div>
      )}

      {/* Toolbar */}
      <div className="my-listings-toolbar">
        <div className="my-listings-search">
          <Search size={14} />
          <input
            id="my-listings-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title or location…"
          />
        </div>

        <div className="filter-group-inline">
          <label>Status:</label>
          <select
            id="my-listings-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s || 'All Statuses'}</option>
            ))}
          </select>
        </div>

        <div className="filter-group-inline">
          <ArrowUpDown size={13} />
          <select
            id="my-listings-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="seller-error-state">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => { setError(''); fetchListings(); }} className="seller-retry-btn">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="seller-loading-state">
          <RefreshCw size={20} className="spin-icon" />
          <span>Loading your listings…</span>
        </div>
      ) : listings.length === 0 ? (
        <div className="seller-empty-state">
          <div className="seller-empty-icon">
            <Building2 size={32} />
          </div>
          <h3>No listings found</h3>
          <p>{statusFilter || query ? 'Try adjusting your search or filter.' : "You haven't listed any properties yet."}</p>
        </div>
      ) : (
        <div className="my-listings-grid">
          {listings.map((listing) => {
            const statusInfo = STATUS_LABELS[listing.listing_status] || { cls: 'status-draft', label: listing.listing_status || 'Unknown' };
            return (
              <div key={listing.id} className="my-listing-card">
                <div className="mlc-image-wrap">
                  <img src={listing.image} alt={listing.title} />
                  <span className={`mlc-status-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                </div>
                <div className="mlc-body">
                  <span className="mlc-type">{listing.type}</span>
                  <h3 className="mlc-title">{listing.title}</h3>
                  <div className="mlc-location">
                    <MapPin size={12} />
                    <span>{listing.location}</span>
                  </div>
                  <div className="mlc-meta">
                    <span className="mlc-price">{formatInr(listing.price)}</span>
                    <span className="mlc-area">
                      <Maximize2 size={11} />
                      {listing.area} {listing.area_unit || 'sq.ft'}
                    </span>
                  </div>
                  {listing.is_sample && (
                    <div className="mlc-sample-label">Development sample listing</div>
                  )}
                  <div className="mlc-date">Updated {formatDate(listing.updated_at || listing.created_at)}</div>

                  <div className="mlc-actions">
                    <button
                      className="mlc-action-btn"
                      onClick={() => onSelectProperty && onSelectProperty(listing)}
                      title="Preview"
                      id={`preview-listing-${listing.id}`}
                    >
                      <Eye size={13} />
                      <span>Preview</span>
                    </button>

                    {!listing.is_sample && (
                      <button
                        className="mlc-action-btn edit-action"
                        onClick={() => onEditProperty && onEditProperty(listing)}
                        title="Edit Listing"
                        id={`edit-listing-${listing.id}`}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                    )}

                    {!listing.is_sample && (
                      <>
                        {listing.listing_status !== 'Published' && (
                          <button
                            className="mlc-action-btn primary"
                            onClick={() => handleStatusChange(listing.id, 'Published')}
                            title="Publish"
                            id={`publish-listing-${listing.id}`}
                          >
                            <Globe size={13} />
                            <span>Publish</span>
                          </button>
                        )}
                        {listing.listing_status === 'Published' && (
                          <button
                            className="mlc-action-btn"
                            onClick={() => handleStatusChange(listing.id, 'Unpublished')}
                            title="Unpublish"
                            id={`unpublish-listing-${listing.id}`}
                          >
                            <EyeOff size={13} />
                            <span>Unpublish</span>
                          </button>
                        )}
                        {listing.listing_status === 'Published' || listing.listing_status === 'Unpublished' ? null : null}
                        <button
                          className="mlc-action-btn draft-action"
                          onClick={() => handleStatusChange(listing.id, 'Draft')}
                          title="Move to Draft"
                          id={`draft-listing-${listing.id}`}
                        >
                          <FileText size={13} />
                          <span>Draft</span>
                        </button>
                        <button
                          className="mlc-action-btn danger"
                          onClick={() => setDeleteId(listing.id)}
                          title="Delete"
                          id={`delete-listing-${listing.id}`}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteId && (
        <div className="delete-confirm-overlay" role="dialog" aria-modal="true">
          <div className="delete-confirm-dialog">
            <div className="delete-confirm-icon">
              <Trash2 size={24} />
            </div>
            <h3>Delete Listing?</h3>
            <p>This action cannot be undone. The listing will be permanently removed from the marketplace.</p>
            <div className="delete-confirm-actions">
              <button
                className="delete-cancel-btn"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                id="delete-cancel-btn"
              >
                Cancel
              </button>
              <button
                className="delete-confirm-btn"
                onClick={confirmDelete}
                disabled={deleting}
                id="delete-confirm-btn"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
