import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Layers,
  Building,
  Maximize2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export default function MapExplorer({ properties = [], onSelectProperty }) {
  const [selectedCity, setSelectedCity] = useState('All');
  const [activePin, setActivePin] = useState(null);

  // Geographic coordinates for properties in South India
  const locations = [
    {
      id: 'coimbatore',
      name: 'Coimbatore',
      lat: '11.0168° N',
      lng: '76.9558° E',
      activeCount: properties.filter((p) => p.location.includes('Coimbatore')).length,
    },
    {
      id: 'bengaluru',
      name: 'Bengaluru',
      lat: '12.9716° N',
      lng: '77.5946° E',
      activeCount: properties.filter((p) => p.location.includes('Bengaluru')).length,
    },
    {
      id: 'chennai',
      name: 'Chennai',
      lat: '13.0827° N',
      lng: '80.2707° E',
      activeCount: properties.filter((p) => p.location.includes('Chennai')).length,
    },
  ];

  const filteredProperties =
    selectedCity === 'All'
      ? properties
      : properties.filter((p) => p.location.toLowerCase().includes(selectedCity.toLowerCase()));

  return (
    <section className="map-explorer-section">
      <div className="section-header-block">
        <div>
          <div className="hero-eyebrow">
            <span className="eyebrow-pill">GEOGRAPHIC PROPERTY LOCATOR</span>
            <span className="eyebrow-note">CADASTRAL &amp; SATELLITE TILES</span>
          </div>
          <h1>Map Explorer</h1>
          <p className="section-subtext">
            Explore verified land parcels and homes across prime corridors in Tamil Nadu and Karnataka.
          </p>
        </div>

        {/* City Filter Pills */}
        <div className="city-filter-buttons">
          <button
            type="button"
            className={`city-pill ${selectedCity === 'All' ? 'active' : ''}`}
            onClick={() => setSelectedCity('All')}
          >
            All Corridors ({properties.length})
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              className={`city-pill ${selectedCity === loc.name ? 'active' : ''}`}
              onClick={() => setSelectedCity(loc.name)}
            >
              {loc.name} ({loc.activeCount})
            </button>
          ))}
        </div>
      </div>

      <div className="map-layout-grid">
        {/* Interactive Stylized Vector Cadastral Map Canvas */}
        <div className="vector-map-frame">
          <div className="map-canvas-mock">
            {/* Grid Pattern Background */}
            <div className="cadastral-grid-overlay" />

            {/* Regional Map Boundary Contours */}
            <svg
              className="cadastral-svg-layer"
              viewBox="0 0 800 500"
              fill="none"
              stroke="#E6E6E6"
              strokeWidth="1.2"
            >
              {/* Arterial highways & survey demarcations */}
              <path d="M 50 150 Q 200 120 400 240 T 750 350" stroke="#CCCCCC" strokeDasharray="4 4" />
              <path d="M 250 50 Q 300 250 350 450" stroke="#CCCCCC" strokeDasharray="3 3" />
              <path d="M 500 80 L 520 420" stroke="#CCCCCC" strokeWidth="1" />
              <rect x="180" y="210" width="140" height="90" rx="8" fill="#F2EFEA" stroke="#D8D8D8" />
              <text x="195" y="240" fill="#666666" fontSize="11" fontWeight="600">
                COIMBATORE ZONE
              </text>
              <rect x="420" y="110" width="160" height="110" rx="8" fill="#F2EFEA" stroke="#D8D8D8" />
              <text x="440" y="140" fill="#666666" fontSize="11" fontWeight="600">
                BENGALURU CORRIDOR
              </text>
              <rect x="580" y="260" width="150" height="100" rx="8" fill="#F2EFEA" stroke="#D8D8D8" />
              <text x="600" y="290" fill="#666666" fontSize="11" fontWeight="600">
                CHENNAI ECR / OMR
              </text>
            </svg>

            {/* Interactive Property Markers */}
            <div className="map-pins-layer">
              {filteredProperties.map((prop, idx) => {
                // Determine approximate pin positions on grid
                const leftPos = prop.location.includes('Coimbatore')
                  ? 22 + (idx % 3) * 6
                  : prop.location.includes('Chennai')
                  ? 75 + (idx % 2) * 5
                  : 52 + (idx % 3) * 6;
                const topPos = prop.location.includes('Coimbatore')
                  ? 45 + (idx % 3) * 8
                  : prop.location.includes('Chennai')
                  ? 55 + (idx % 2) * 8
                  : 28 + (idx % 3) * 8;

                const isSelected = activePin?.id === prop.id;

                return (
                  <div
                    key={prop.id}
                    className={`property-map-pin ${isSelected ? 'selected' : ''}`}
                    style={{ left: `${leftPos}%`, top: `${topPos}%` }}
                    onClick={() => setActivePin(prop)}
                  >
                    <div className="pin-marker-dot">
                      <Building size={12} />
                    </div>
                    <span className="pin-price-label">
                      ₹{prop.price >= 10000000 ? `${(prop.price / 10000000).toFixed(1)}Cr` : `${(prop.price / 100000).toFixed(0)}L`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Map Controls */}
            <div className="map-floating-controls">
              <div className="control-group">
                <button type="button" className="control-btn" title="Cadastral Cadence">
                  <Layers size={14} />
                  <span>Cadastral</span>
                </button>
                <button type="button" className="control-btn" title="Recentralize View">
                  <Navigation size={14} />
                  <span>Center</span>
                </button>
              </div>
            </div>

            {/* Active Pin Preview Popup (if selected) */}
            {activePin && (
              <div className="pin-active-popup">
                <img src={activePin.image} alt={activePin.title} className="popup-thumb" />
                <div className="popup-info">
                  <strong>{activePin.title}</strong>
                  <p>{activePin.location}</p>
                  <div className="popup-price-row">
                    <span>₹{(activePin.price / 100000).toFixed(2)} Lakhs</span>
                    <span>{activePin.area} sq.ft</span>
                  </div>
                  <button
                    type="button"
                    className="popup-action-btn"
                    onClick={() => onSelectProperty(activePin)}
                  >
                    <span>View Parcel Details</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Parcel Cards List */}
        <div className="map-properties-rail">
          <div className="rail-header">
            <h4>Properties in View ({filteredProperties.length})</h4>
            <span>Click any parcel to highlight</span>
          </div>

          <div className="rail-cards-scroll">
            {filteredProperties.map((property) => (
              <div
                key={property.id}
                className={`rail-property-card ${activePin?.id === property.id ? 'active' : ''}`}
                onClick={() => {
                  setActivePin(property);
                  onSelectProperty(property);
                }}
              >
                <img src={property.image} alt={property.title} className="rail-card-img" />
                <div className="rail-card-body">
                  <strong>{property.title}</strong>
                  <span className="rail-location">{property.location}</span>
                  <div className="rail-meta-row">
                    <span className="rail-price">
                      ₹{property.price >= 10000000 ? `${(property.price / 10000000).toFixed(2)} Cr` : `₹${(property.price / 100000).toFixed(2)} L`}
                    </span>
                    <span className="rail-area">{property.area} sq.ft</span>
                  </div>
                  <div className="rail-verify-tag">
                    <ShieldCheck size={12} />
                    <span>{property.verified ? 'Verified Document' : 'Document Pending'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
