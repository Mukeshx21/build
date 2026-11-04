import React from 'react';
import { Bookmark, Building, ArrowRight, ShieldCheck, Trash2, Search } from 'lucide-react';

export default function SavedProperties({
  savedProperties = [],
  onSelectProperty,
  onRemoveSaved,
  onExploreProperties,
  user,
  onOpenAuth
}) {
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

  if (!user) {
    return (
      <section className="saved-properties-page">
        <div className="saved-auth-prompt-card">
          <div className="saved-icon-circle">
            <Bookmark size={32} />
          </div>
          <h2>Sign in to view your saved properties</h2>
          <p>
            Create a personal shortlist of parcels and homes, track document verification progress, and schedule site visits.
          </p>
          <button type="button" className="saved-signin-btn" onClick={() => onOpenAuth('login')}>
            <span>Sign In to Your Account</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="saved-properties-page">
      <div className="section-header-block">
        <div>
          <div className="hero-eyebrow">
            <span className="eyebrow-pill">USER SHORTLIST</span>
            <span className="eyebrow-note">SYNCED WITH YOUR ACCOUNT</span>
          </div>
          <h1>Saved Properties ({savedProperties.length})</h1>
          <p className="section-subtext">
            Review your shortlisted land parcels, compare pricing and verify legal readiness before scheduling visits.
          </p>
        </div>

        {savedProperties.length > 0 && (
          <button type="button" className="explore-more-btn" onClick={onExploreProperties}>
            <Search size={14} />
            <span>Discover More Properties</span>
          </button>
        )}
      </div>

      {savedProperties.length > 0 ? (
        <div className="saved-properties-grid">
          {savedProperties.map((property) => (
            <article
              key={property.id}
              className="saved-property-card"
              onClick={() => onSelectProperty(property)}
            >
              <div className="saved-card-thumb">
                <img src={property.image} alt={property.title} />
                <button
                  type="button"
                  className="saved-remove-btn"
                  title="Remove from saved"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSaved(property.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="saved-card-body">
                <div className="saved-price-row">
                  <strong>{formatInr(property.price)}</strong>
                  <span>{property.area} sq.ft</span>
                </div>

                <h3 className="saved-title">{property.title}</h3>
                <p className="saved-location">{property.location}</p>

                <div className="saved-card-footer">
                  <div className="saved-verify-badge">
                    <ShieldCheck size={13} />
                    <span>{property.verified ? 'Documents Verified' : 'Check Pending'}</span>
                  </div>
                  <span className="saved-details-link">Details &rarr;</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="saved-empty-card">
          <div className="empty-icon-circle">
            <Bookmark size={36} />
          </div>
          <h3>No properties saved yet</h3>
          <p>
            When exploring properties on the marketplace, click the bookmark icon on any card to save it here for convenient comparison.
          </p>
          <button type="button" className="empty-action-btn" onClick={onExploreProperties}>
            <span>Browse Available Listings</span>
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </section>
  );
}
