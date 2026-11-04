import React from 'react';
import {
  MapPin,
  Bookmark,
  ShieldCheck,
  Maximize2,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export default function PropertyCard({
  property,
  onSelect,
  onToggleSave,
  isSaved = false
}) {
  const status = (property.status || 'AVAILABLE').toUpperCase();
  const isSold = status === 'SOLD';
  const isPending = status === 'PENDING';

  const formatInr = (amount) => {
    if (!amount) return '₹0';
    const num = Number(amount);
    if (num >= 10000000) {
      return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(2)} L`;
    }
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const calculateCents = (sqft) => {
    if (!sqft) return '';
    const cents = (Number(sqft) / 435.6).toFixed(1);
    return `${cents} Cents`;
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onToggleSave(property.id);
  };

  return (
    <article
      className={`property-card-root ${isSold ? 'card-is-sold' : ''}`}
      onClick={() => onSelect(property)}
    >
      {/* Property Visual */}
      <div className="card-visual-wrapper">
        <img
          src={property.image}
          alt={property.title}
          className="card-main-image"
          loading="lazy"
        />

        {/* Top Badges */}
        <div className="card-top-badges">
          {isSold ? (
            <span className="property-status-badge badge-sold">SOLD</span>
          ) : isPending ? (
            <span className="property-status-badge badge-pending">PENDING</span>
          ) : null}
          <span className="property-type-pill">{property.type || property.property_type || 'Land'}</span>
          {property.score && (
            <span className="match-score-pill">
              <Sparkles size={11} />
              <span>{property.score}% Match</span>
            </span>
          )}
        </div>

        {/* Favorite Bookmark Button */}
        <button
          type="button"
          className={`favorite-action-btn ${isSaved ? 'favorited' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isSaved ? 'Remove from saved' : 'Save property'}
        >
          <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
        </button>

        {/* Bottom Verification Pill */}
        <div className="card-verification-banner">
          <ShieldCheck size={13} />
          <span>{property.verified ? 'Documents Verified' : 'Review In Progress'}</span>
        </div>
      </div>

      {/* Property Details Body */}
      <div className="card-details-body">
        <div className="card-price-row">
          <span className="property-price-main">{formatInr(property.price)}</span>
          <span className="property-price-sub">
            ₹{Math.round(property.price / property.area).toLocaleString('en-IN')}/sq.ft
          </span>
        </div>

        <h3 className="property-title-text">{property.title}</h3>

        <div className="property-location-row">
          <MapPin size={13} />
          <span>{property.location}</span>
          {property.address && property.address !== property.location && (
            <span className="card-address-hint">• {property.address}</span>
          )}
        </div>

        {/* Spec Tags */}
        <div className="property-specs-grid">
          <div className="spec-item">
            <Maximize2 size={12} />
            <span>{property.area} sq.ft</span>
          </div>
          <div className="spec-dot" />
          <div className="spec-item">
            <span>{calculateCents(property.area)}</span>
          </div>
          <div className="spec-dot" />
          <div className="spec-item">
            <span>{property.type || property.property_type || 'Land'}</span>
          </div>
        </div>

        {/* Feature Tags */}
        {property.tags && property.tags.length > 0 && (
          <div className="property-tags-wrap">
            {property.tags.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="feature-tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* View Details Action */}
        <div className="card-footer-action">
          <span className="action-text">
            {isSold ? 'View sold record & details' : 'View details & legal checks'}
          </span>
          <div className="action-arrow">
            <ArrowUpRight size={14} />
          </div>
        </div>
      </div>
    </article>
  );
}
