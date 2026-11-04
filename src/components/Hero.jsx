import React from 'react';
import { Search, MapPin, Home, IndianRupee, Maximize2, Shield, ArrowRight } from 'lucide-react';

export default function Hero({
  filters,
  onFilterChange,
  onSearch,
  totalProperties = 8,
  onNavigateVerify
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <section className="terra-hero">
      <div className="hero-grid-container">
        {/* Left: Text & Interactive Search Bar */}
        <div className="hero-copy-column">
          <div className="hero-eyebrow">
            <span className="eyebrow-pill">AI-POWERED PROPERTY RECOMMENDATION</span>
            <span className="eyebrow-note">SOUTH INDIA REALTY</span>
          </div>

          <h1 className="hero-title">
            Find Your
            <br />
            <em>Perfect Property</em>
          </h1>

          <p className="hero-subtitle">
            Discover land and homes with transparent details and intelligent recommendations.
          </p>

          {/* Quick trust metrics */}
          <div className="hero-trust-metrics">
            <div className="trust-item">
              <strong>100%</strong>
              <span>Document OCR checks</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <strong>DTCP / CMDA</strong>
              <span>Zoning guidelines</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-item">
              <strong>Direct Owner</strong>
              <span>Transparent listings</span>
            </div>
          </div>

          {/* Integrated Search Console */}
          <form className="hero-search-card" onSubmit={handleSubmit}>
            <div className="search-card-header">
              <span className="search-card-label">PROPERTY FILTER ENGINE</span>
              <span className="search-card-count">{totalProperties} available parcels</span>
            </div>

            <div className="search-inputs-grid">
              {/* Location Input */}
              <div className="search-field">
                <label htmlFor="hero-loc">
                  <MapPin size={13} />
                  <span>Location</span>
                </label>
                <input
                  id="hero-loc"
                  type="text"
                  value={filters.location}
                  onChange={(e) => onFilterChange('location', e.target.value)}
                  placeholder="Coimbatore, Bengaluru, Chennai..."
                />
              </div>

              {/* Property Type */}
              <div className="search-field">
                <label htmlFor="hero-type">
                  <Home size={13} />
                  <span>Property Type</span>
                </label>
                <select
                  id="hero-type"
                  value={filters.type}
                  onChange={(e) => onFilterChange('type', e.target.value)}
                >
                  <option value="">All Categories</option>
                  <option value="Plot">Plot / Land</option>
                  <option value="Residential">Residential Site</option>
                  <option value="Villa">Independent Villa</option>
                  <option value="Commercial">Commercial Land</option>
                </select>
              </div>

              {/* Budget Range */}
              <div className="search-field">
                <label htmlFor="hero-budget">
                  <IndianRupee size={13} />
                  <span>Max Budget</span>
                </label>
                <select
                  id="hero-budget"
                  value={filters.maxPrice}
                  onChange={(e) => onFilterChange('maxPrice', e.target.value)}
                >
                  <option value="">Any Budget</option>
                  <option value="3000000">Under ₹30 Lakhs</option>
                  <option value="5000000">Under ₹50 Lakhs</option>
                  <option value="10000000">Under ₹1.00 Crore</option>
                  <option value="20000000">Under ₹2.00 Crores</option>
                </select>
              </div>

              {/* Land Area */}
              <div className="search-field">
                <label htmlFor="hero-area">
                  <Maximize2 size={13} />
                  <span>Min Area (sq.ft)</span>
                </label>
                <select
                  id="hero-area"
                  value={filters.minArea}
                  onChange={(e) => onFilterChange('minArea', e.target.value)}
                >
                  <option value="">Any Area</option>
                  <option value="1200">1,200+ sq.ft (2.75 cents)</option>
                  <option value="1800">1,800+ sq.ft (4.13 cents)</option>
                  <option value="2400">2,400+ sq.ft (5.5 cents)</option>
                  <option value="4000">4,000+ sq.ft (Acreage)</option>
                </select>
              </div>
            </div>

            <div className="search-action-bar">
              <button type="submit" className="hero-search-btn">
                <Search size={16} />
                <span>Search Properties</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right: Architectural Image Showcase */}
        <div className="hero-showcase-column">
          <div className="hero-image-frame">
            <img
              src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1400&q=85"
              alt="Luxury architectural residence in landscaped acreage"
              className="hero-main-photo"
            />
            <div className="hero-floating-badge">
              <div className="badge-shield-icon">
                <Shield size={16} />
              </div>
              <div className="badge-text-group">
                <strong>Document Integrity Verified</strong>
                <span>Patta, Chitta &amp; Survey 142/3A</span>
              </div>
            </div>

            <div className="hero-callout-overlay">
              <div className="callout-inner">
                <span className="callout-tag">LEGAL INTELLIGENCE</span>
                <p>Have an existing sale deed or patta? Test our OCR verification engine.</p>
                <button type="button" className="callout-link-btn" onClick={onNavigateVerify}>
                  <span>Upload for verification</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
