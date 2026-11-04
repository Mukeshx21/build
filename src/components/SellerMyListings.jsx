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
  Maximize2,
  CheckCircle2,
  Tag,
  RotateCcw,
  Clock,
} from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'AVAILABLE', label: 'Available (Active)' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'PENDING', label: 'Pending Sale' },
  { value: 'DRAFT', label: 'Draft' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export default function SellerMyListings({
  user,
  onSelectProperty,
  onEditProperty,
  onListingChanged,
}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('newest');
  
  // Modals state
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [soldConfirmProperty, setSoldConfirmProperty] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
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
      if (statusFilter) params.set('status', statusFilter);

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

  // Change property market status: AVAILABLE | SOLD | PENDING | DRAFT
  const handlePropertyStatus = async (propertyId, newStatus) => {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update property status');

      setActionFeedback(
        newStatus === 'SOLD'
          ? 'Property successfully marked as SOLD. It has been archived from active buyer search.'
          : `Property status updated to ${newStatus}.`
      );
      setTimeout(() => setActionFeedback(''), 4000);

      setSoldConfirmProperty(null);
      fetchListings();

      if (onListingChanged) {
        onListingChanged();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

  // Delete listing permanently
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

      if (onListingChanged) {
        onListingChanged();
      }
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
    return new Date(dt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="my-listings-page animate-fade">
      {/* Header */}
      <div className="seller-page-header">
        <div className="seller-header-text">
          <div className="hero-eyebrow">
            <span className="eyebrow-pill">SELLER PORTAL</span>
            <span className="eyebrow-note">PROPERTY INVENTORY &amp; SALES</span>
          </div>
          <h1>My Property Listings</h1>
          <p className="seller-header-sub">
            Manage your land parcels, update availability, mark properties as SOLD, and track buyer interest.
          </p>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="seller-feedback-banner">
          <CheckCircle2 size={16} />
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback('')}>
            <X size={13} />
          </button>
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
            placeholder="Search by title, address, or corridor…"
          />
        </div>

        <div className="filter-group-inline">
          <label>Status:</label>
          <select
            id="my-listings-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
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
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="seller-error-state">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            onClick={() => {
              setError('');
              fetchListings();
            }}
            className="seller-retry-btn"
          >
            Retry
          </button>
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
          <p>
            {statusFilter || query
              ? 'Try adjusting your search or filter.'
              : "You haven't listed any properties yet."}
          </p>
        </div>
      ) : (
        <div className="my-listings-grid">
          {listings.map((listing) => {
            const isSold = listing.status === 'SOLD';
            const isPending = listing.status === 'PENDING';
            const isDraft = listing.status === 'DRAFT' || listing.listing_status === 'Draft';

            return (
              <div
                key={listing.id}
                className={`my-listing-card ${isSold ? 'listing-is-sold' : ''}`}
              >
                <div className="mlc-image-wrap">
                  <img src={listing.image} alt={listing.title} />
                  {/* Distinct Status Badges */}
                  {isSold ? (
                    <span className="mlc-status-badge status-sold-pill">SOLD</span>
                  ) : isPending ? (
                    <span className="mlc-status-badge status-pending-pill">PENDING SALE</span>
                  ) : isDraft ? (
                    <span className="mlc-status-badge status-draft-pill">DRAFT</span>
                  ) : (
                    <span className="mlc-status-badge status-available-pill">AVAILABLE</span>
                  )}
                </div>
                <div className="mlc-body">
                  <span className="mlc-type">{listing.type}</span>
                  <h3 className="mlc-title">{listing.title}</h3>
                  <div className="mlc-location">
                    <MapPin size={12} />
                    <span>{listing.address || listing.location}</span>
                  </div>
                  <div className="mlc-meta">
                    <span className="mlc-price">{formatInr(listing.price)}</span>
                    <span className="mlc-area">
                      <Maximize2 size={11} />
                      {listing.area} {listing.area_unit || 'sq.ft'}
                    </span>
                  </div>

                  {isSold && listing.sold_at && (
                    <div className="mlc-sold-info-note">
                      <CheckCircle2 size={12} />
                      <span>Sold on {formatDate(listing.sold_at)}</span>
                    </div>
                  )}

                  {listing.is_sample && (
                    <div className="mlc-sample-label">Development sample listing</div>
                  )}
                  <div className="mlc-date">
                    Updated {formatDate(listing.updated_at || listing.created_at)}
                  </div>

                  {/* Actions Bar */}
                  <div className="mlc-actions">
                    {/* Preview */}
                    <button
                      className="mlc-action-btn"
                      onClick={() => onSelectProperty && onSelectProperty(listing)}
                      title="Preview Listing"
                      id={`preview-listing-${listing.id}`}
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>

                    {/* Edit */}
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
                        {/* MARK AS SOLD Button */}
                        {!isSold ? (
                          <button
                            className="mlc-action-btn sold-action-btn"
                            onClick={() => setSoldConfirmProperty(listing)}
                            title="Mark property as SOLD"
                            id={`mark-sold-${listing.id}`}
                          >
                            <Tag size={13} />
                            <span>Mark Sold</span>
                          </button>
                        ) : (
                          /* REVERSE TO AVAILABLE */
                          <button
                            className="mlc-action-btn available-action-btn"
                            onClick={() => handlePropertyStatus(listing.id, 'AVAILABLE')}
                            title="Restore property as Available"
                            id={`mark-available-${listing.id}`}
                          >
                            <RotateCcw size={13} />
                            <span>Mark Available</span>
                          </button>
                        )}

                        {/* MARK AS PENDING Toggle */}
                        {!isSold && (
                          <button
                            className={`mlc-action-btn ${isPending ? 'active-pending' : ''}`}
                            onClick={() =>
                              handlePropertyStatus(
                                listing.id,
                                isPending ? 'AVAILABLE' : 'PENDING'
                              )
                            }
                            title={isPending ? 'Set back to Available' : 'Mark sale in progress'}
                          >
                            <Clock size={13} />
                            <span>{isPending ? 'Available' : 'Pending'}</span>
                          </button>
                        )}

                        {/* DELETE */}
                        <button
                          className="mlc-action-btn danger"
                          onClick={() => setDeleteId(listing.id)}
                          title="Delete Listing"
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
              This will record the transaction, update the property marker to SOLD, and remove
              it from active buyer searches. Existing records will be securely preserved.
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
                onClick={() => handlePropertyStatus(soldConfirmProperty.id, 'SOLD')}
                disabled={statusUpdating}
              >
                {statusUpdating ? 'Updating…' : 'Yes, Confirm SOLD'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Delete */}
      {deleteId && (
        <div className="delete-confirm-overlay" role="dialog" aria-modal="true">
          <div className="delete-confirm-dialog">
            <div className="delete-confirm-icon">
              <Trash2 size={24} />
            </div>
            <h3>Delete Listing?</h3>
            <p>
              This action cannot be undone. The listing will be permanently removed from the
              marketplace.
            </p>
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
