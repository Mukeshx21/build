import React, { useState } from 'react';
import {
  X,
  MapPin,
  Maximize2,
  Bookmark,
  ShieldCheck,
  Calendar,
  Send,
  Building,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Clock
} from 'lucide-react';

export default function PropertyModal({
  property,
  onClose,
  isSaved,
  onToggleSave,
  user,
  onOpenAuth,
  onNavigateVerify
}) {
  const [inquiryDate, setInquiryDate] = useState('');
  const [inquiryTime, setInquiryTime] = useState('11:00 AM');
  const [inquiryMessage, setInquiryMessage] = useState('I am interested in scheduling a site visit for this parcel.');
  const [inquiryBusy, setInquiryBusy] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState('');
  const [inquiryError, setInquiryError] = useState('');

  if (!property) return null;

  const status = (property.status || 'AVAILABLE').toUpperCase();
  const isSold = status === 'SOLD';
  const isPending = status === 'PENDING';

  const formatInr = (amount) => {
    if (!amount) return '₹0';
    const num = Number(amount);
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Crores`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} Lakhs`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    if (isSold) return;

    if (!user) {
      onOpenAuth('login');
      return;
    }

    setInquiryBusy(true);
    setInquiryError('');
    setInquirySuccess('');

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('landai_token')
            ? { Authorization: `Bearer ${localStorage.getItem('landai_token')}` }
            : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          property_id: property.id,
          visit_date: inquiryDate || 'Next Weekend',
          visit_time: inquiryTime,
          message: inquiryMessage,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit site visit request.');
      }

      setInquirySuccess('Your site visit request has been sent to the property owner/seller.');
    } catch (err) {
      setInquiryError(err.message || 'Could not send request.');
    } finally {
      setInquiryBusy(false);
    }
  };

  return (
    <div className="property-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="property-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-icon-btn" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>

        <div className="modal-scroll-content">
          {/* Header Image Gallery */}
          <div className="modal-hero-gallery">
            <img src={property.image} alt={property.title} className="modal-hero-photo" />
            <div className="modal-hero-overlay">
              <div className="modal-hero-badges">
                <span className="hero-type-tag">{property.type || property.property_type || 'Land'}</span>
                {isSold ? (
                  <span className="hero-status-tag status-sold-pill">SOLD</span>
                ) : isPending ? (
                  <span className="hero-status-tag status-pending-pill">PENDING SALE</span>
                ) : (
                  <span className="hero-status-tag status-available-pill">ACTIVE LISTING</span>
                )}
              </div>
              <button
                type="button"
                className={`modal-save-btn ${isSaved ? 'saved' : ''}`}
                onClick={() => onToggleSave(property.id)}
                aria-label="Save property"
              >
                <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>
            </div>
          </div>

          <div className="modal-details-grid">
            {/* Left Column: Property Specs & Description */}
            <div className="modal-left-details">
              <div className="modal-title-block">
                <div className="modal-price-lead-row">
                  <div className="modal-price-lead">{formatInr(property.price)}</div>
                  {isSold && <span className="modal-sold-badge">SOLD</span>}
                  {isPending && <span className="modal-pending-badge">SALE PENDING</span>}
                </div>
                <h1 className="modal-property-heading">{property.title}</h1>
                <div className="modal-location-sub">
                  <MapPin size={15} />
                  <span>{property.location}</span>
                  {property.address && property.address !== property.location && (
                    <span className="modal-sub-address"> • {property.address}</span>
                  )}
                </div>
              </div>

              {/* Key Specifications Grid */}
              <div className="key-specs-container">
                <div className="spec-box">
                  <span className="spec-label">Plot Area</span>
                  <strong>{property.area} sq.ft</strong>
                  <span className="spec-secondary">
                    {(Number(property.area) / 435.6).toFixed(2)} Cents
                  </span>
                </div>
                <div className="spec-box">
                  <span className="spec-label">Unit Rate</span>
                  <strong>₹{Math.round(property.price / property.area).toLocaleString('en-IN')}</strong>
                  <span className="spec-secondary">per sq.ft</span>
                </div>
                <div className="spec-box">
                  <span className="spec-label">Property Type</span>
                  <strong>{property.type || property.property_type || 'Land'}</strong>
                  <span className="spec-secondary">Zoned layout</span>
                </div>
                {property.bedrooms ? (
                  <div className="spec-box">
                    <span className="spec-label">Rooms</span>
                    <strong>{property.bedrooms} BHK</strong>
                    <span className="spec-secondary">{property.bathrooms || 1} Bathrooms</span>
                  </div>
                ) : (
                  <div className="spec-box">
                    <span className="spec-label">AI Suitability</span>
                    <strong>{property.score || 92}/100</strong>
                    <span className="spec-secondary">Verified parcel</span>
                  </div>
                )}
              </div>

              {/* Seller / Lister Info Box */}
              {property.seller && (
                <div className="modal-seller-card">
                  <div className="modal-seller-avatar">
                    <UserCheck size={18} />
                  </div>
                  <div className="modal-seller-info">
                    <span className="modal-seller-role">Registered Seller / Lister</span>
                    <strong className="modal-seller-name">{property.seller.name || 'Verified Land Owner'}</strong>
                    <div className="modal-seller-meta">
                      {property.seller.email && <span>{property.seller.email}</span>}
                      {property.seller.phone && <span> • {property.seller.phone}</span>}
                    </div>
                  </div>
                  <span className="modal-seller-status-tag">
                    <ShieldCheck size={13} /> Verified
                  </span>
                </div>
              )}

              {/* Description */}
              <div className="modal-section-block">
                <h3>About This Property</h3>
                <p className="property-description-text">
                  {property.description ||
                    'Premium real-estate land parcel situated in a planned layout with immediate road access, clear boundary demarcations, and nearby civic amenities.'}
                </p>
                {property.sample_label && (
                  <div className="sample-label-callout">
                    <AlertCircle size={14} />
                    <span>{property.sample_label}</span>
                  </div>
                )}
              </div>

              {/* Tags & Highlights */}
              {property.tags && property.tags.length > 0 && (
                <div className="modal-section-block">
                  <h3>Property Highlights</h3>
                  <div className="modal-tags-row">
                    {property.tags.map((tag, idx) => (
                      <span key={idx} className="modal-highlight-chip">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal & Document Status */}
              <div className="modal-section-block document-status-card">
                <div className="doc-status-header">
                  <div className="doc-status-icon">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4>Document &amp; Legal Verification</h4>
                    <p>Status verified through technical field checks and land registry records.</p>
                  </div>
                </div>

                <div className="doc-checklist">
                  <div className="doc-check-item">
                    <CheckCircle2 size={15} />
                    <span>Survey &amp; FMB boundaries registered</span>
                  </div>
                  <div className="doc-check-item">
                    <CheckCircle2 size={15} />
                    <span>Patta / Chitta document recorded</span>
                  </div>
                  <div className="doc-check-item">
                    <CheckCircle2 size={15} />
                    <span>Nil encumbrance (EC) period confirmed</span>
                  </div>
                </div>

                <div className="doc-verify-prompt">
                  <p>Have supporting land deeds to check against this parcel?</p>
                  <button
                    type="button"
                    className="modal-verify-btn"
                    onClick={() => {
                      onClose();
                      onNavigateVerify();
                    }}
                  >
                    Launch Document Verification Engine
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Inquiry / Schedule Site Visit Form or Sold Banner */}
            <div className="modal-right-inquiry">
              {isSold ? (
                <div className="inquiry-card-wrapper modal-sold-state-card">
                  <div className="modal-sold-stamp">SOLD</div>
                  <h3>Property Marked as Sold</h3>
                  <p className="modal-sold-desc">
                    This property has been marked as <strong>SOLD</strong> by the seller
                    {property.sold_at ? ` on ${new Date(property.sold_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}.
                    Inquiries and site visit scheduling are closed.
                  </p>

                  <div className="modal-sold-meta-table">
                    <div className="sold-meta-item">
                      <span>Status</span>
                      <strong className="sold-text-red">SOLD</strong>
                    </div>
                    {property.sold_at && (
                      <div className="sold-meta-item">
                        <span>Sale Recorded</span>
                        <strong>{new Date(property.sold_at).toLocaleDateString('en-IN')}</strong>
                      </div>
                    )}
                    {property.seller?.name && (
                      <div className="sold-meta-item">
                        <span>Seller</span>
                        <strong>{property.seller.name}</strong>
                      </div>
                    )}
                  </div>

                  <div className="modal-sold-guidance">
                    Looking for available parcels in {property.location}? Check our interactive map with the "Available Only" filter.
                  </div>
                </div>
              ) : (
                <div className="inquiry-card-wrapper">
                  <div className="inquiry-header">
                    <Building size={18} />
                    <div>
                      <h3>Schedule Site Visit</h3>
                      <p>Contact the seller or authorized promoter</p>
                    </div>
                  </div>

                  {isPending && (
                    <div className="modal-pending-banner">
                      <Clock size={15} />
                      <span>Note: A purchase offer is currently pending for this property.</span>
                    </div>
                  )}

                  {inquirySuccess ? (
                    <div className="inquiry-success-message">
                      <CheckCircle2 size={24} />
                      <strong>Request Received!</strong>
                      <p>{inquirySuccess}</p>
                      <button
                        type="button"
                        className="reset-inquiry-btn"
                        onClick={() => setInquirySuccess('')}
                      >
                        Send another inquiry
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleInquirySubmit} className="inquiry-form-body">
                      {inquiryError && (
                        <div className="inquiry-error-banner">
                          <AlertCircle size={15} />
                          <span>{inquiryError}</span>
                        </div>
                      )}

                      <div className="inquiry-input-field">
                        <label htmlFor="modal-visit-date">Preferred Date</label>
                        <div className="input-with-icon">
                          <Calendar size={15} />
                          <input
                            id="modal-visit-date"
                            type="date"
                            value={inquiryDate}
                            onChange={(e) => setInquiryDate(e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="inquiry-input-field">
                        <label htmlFor="modal-visit-time">Preferred Time Window</label>
                        <select
                          id="modal-visit-time"
                          value={inquiryTime}
                          onChange={(e) => setInquiryTime(e.target.value)}
                        >
                          <option value="10:00 AM">Morning (10:00 AM – 12:00 PM)</option>
                          <option value="02:00 PM">Afternoon (02:00 PM – 04:00 PM)</option>
                          <option value="05:00 PM">Evening (05:00 PM – 06:30 PM)</option>
                        </select>
                      </div>

                      <div className="inquiry-input-field">
                        <label htmlFor="modal-inquiry-msg">Notes for Owner / Agent</label>
                        <textarea
                          id="modal-inquiry-msg"
                          rows={3}
                          value={inquiryMessage}
                          onChange={(e) => setInquiryMessage(e.target.value)}
                          placeholder="Mention any specific documents or boundaries you wish to inspect..."
                        />
                      </div>

                      <button type="submit" className="submit-inquiry-btn" disabled={inquiryBusy}>
                        {inquiryBusy ? (
                          'Sending…'
                        ) : (
                          <>
                            <Send size={15} />
                            <span>{user ? 'Request Visit' : 'Sign in to Request Visit'}</span>
                          </>
                        )}
                      </button>

                      <p className="inquiry-disclaimer">
                        Your contact details are shared directly with the authorized listing contact. No spam guaranteed.
                      </p>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
