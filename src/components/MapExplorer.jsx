import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapExplorer.css';

import {
  MapPin,
  Navigation,
  Layers,
  Building,
  Maximize2,
  Minimize2,
  ShieldCheck,
  ArrowRight,
  Search,
  Compass,
  Crosshair,
  Activity,
  Clock,
  Trash2,
  Plus,
  Minus,
  LocateFixed,
  Play,
  Pause,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';

// Tile provider presets
const MAP_LAYERS = {
  standard: {
    id: 'standard',
    name: 'Standard OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 19,
  },
  dark: {
    id: 'dark',
    name: 'Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  topo: {
    id: 'topo',
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
};

// Regional centers for quick corridor filtering
const REGION_CENTERS = {
  All: { center: [11.8, 77.8], zoom: 7 },
  Coimbatore: { center: [11.0168, 76.9558], zoom: 12 },
  Bengaluru: { center: [12.9716, 77.5946], zoom: 12 },
  Chennai: { center: [13.0827, 80.2707], zoom: 12 },
};

// Map realistic geographic coordinates for property listings
function getPropertyCoordinates(property, index = 0) {
  const loc = (property.location || '').toLowerCase();

  // Coimbatore corridor
  if (loc.includes('kovilpalayam')) return [11.1396, 77.0392];
  if (loc.includes('saravanampatti')) return [11.0797, 76.9997];
  if (loc.includes('race course')) return [11.0016, 76.9746];
  if (loc.includes('avinashi')) return [11.0256, 77.0125];
  if (loc.includes('vadavalli')) return [11.0238, 76.9015];
  if (loc.includes('peelamedu')) return [11.0311, 77.0028];
  if (loc.includes('pollachi')) return [10.6609, 77.0048];
  if (loc.includes('kinathukadavu')) return [10.8236, 77.021];
  if (loc.includes('coimbatore')) {
    return [
      11.0168 + ((index % 5) - 2) * 0.02,
      76.9558 + (((index * 3) % 5) - 2) * 0.02,
    ];
  }

  // Bengaluru corridor
  if (loc.includes('whitefield')) return [12.9698, 77.75];
  if (loc.includes('indiranagar')) return [12.9784, 77.6408];
  if (loc.includes('hsr')) return [12.9121, 77.6446];
  if (loc.includes('electronic city')) return [12.8452, 77.6602];
  if (loc.includes('koramangala')) return [12.9352, 77.6245];
  if (loc.includes('hebbal')) return [13.0358, 77.597];
  if (loc.includes('sarjapur')) return [12.8601, 77.7865];
  if (loc.includes('bengaluru') || loc.includes('bangalore')) {
    return [
      12.9716 + ((index % 5) - 2) * 0.025,
      77.5946 + (((index * 3) % 5) - 2) * 0.025,
    ];
  }

  // Chennai corridor
  if (loc.includes('ecr')) return [12.8876, 80.2458];
  if (loc.includes('omr')) return [12.9054, 80.2274];
  if (loc.includes('anna nagar')) return [13.085, 80.2101];
  if (loc.includes('velachery')) return [12.9815, 80.218];
  if (loc.includes('tambaram')) return [12.9249, 80.1];
  if (loc.includes('chennai')) {
    return [
      13.0827 + ((index % 5) - 2) * 0.025,
      80.2707 + (((index * 3) % 5) - 2) * 0.025,
    ];
  }

  // Fallback deterministic coordinates around South India
  const propId = Number(property.id) || 1;
  const baseLat = 11.2 + (propId % 8) * 0.25;
  const baseLng = 77.1 + ((propId * 5) % 8) * 0.25;
  return [baseLat, baseLng];
}

// Distance helper to filter out GPS jitter (< 2 meters)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Cardinal direction conversion
function getHeadingCardinal(deg) {
  if (deg === null || deg === undefined || Number.isNaN(deg)) return 'N/A';
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(deg / 45) % 8;
  return `${Math.round(deg)}° ${directions[index]}`;
}

// Custom Leaflet DivIcons
const createUserMarkerIcon = (heading) => {
  const hasHeading = heading !== null && heading !== undefined;
  const rot = hasHeading ? heading : 0;
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div class="user-pulse-ring"></div>
      <div class="user-location-core">
        ${hasHeading ? `<div class="user-heading-arrow" style="transform: rotate(${rot}deg);">▲</div>` : ''}
        <div class="user-center-dot"></div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const createPropertyMarkerIcon = (property, isSelected) => {
  const priceText =
    property.price >= 10000000
      ? `₹${(property.price / 10000000).toFixed(1)}Cr`
      : `₹${(property.price / 100000).toFixed(0)}L`;
  return L.divIcon({
    className: 'custom-property-pin-wrapper',
    html: `
      <div class="leaflet-property-pin ${isSelected ? 'selected' : ''}">
        <span class="pin-icon">🏢</span>
        <span class="pin-price">${priceText}</span>
      </div>
    `,
    iconSize: [76, 30],
    iconAnchor: [38, 30],
  });
};

const createCustomPinIcon = (index) => {
  return L.divIcon({
    className: 'custom-dropped-pin-wrapper',
    html: `
      <div class="leaflet-dropped-pin">
        <div class="pin-head">#${index}</div>
        <div class="pin-tip"></div>
      </div>
    `,
    iconSize: [30, 36],
    iconAnchor: [15, 36],
  });
};

const createSearchPinIcon = () => {
  return L.divIcon({
    className: 'custom-search-pin-wrapper',
    html: `
      <div class="leaflet-search-pin">
        <span>📍</span>
      </div>
    `,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
  });
};

// Map Sub-controller for dynamic map events and camera flights
function MapController({
  userPosition,
  isFollowingUser,
  flyTarget,
  dropPinMode,
  onMapClick,
  onUserManualPan,
}) {
  const map = useMap();

  useEffect(() => {
    if (userPosition && isFollowingUser) {
      map.flyTo(userPosition, Math.max(map.getZoom(), 15), {
        animate: true,
        duration: 1.2,
      });
    }
  }, [userPosition, isFollowingUser, map]);

  useEffect(() => {
    if (flyTarget) {
      map.flyTo(flyTarget.coords, flyTarget.zoom || 15, {
        animate: true,
        duration: 1.4,
      });
    }
  }, [flyTarget, map]);

  useMapEvents({
    click(e) {
      if (dropPinMode && onMapClick) {
        onMapClick(e.latlng);
      }
    },
    dragstart() {
      if (isFollowingUser && onUserManualPan) {
        onUserManualPan();
      }
    },
  });

  return null;
}

export default function MapExplorer({ properties = [], onSelectProperty }) {
  // Map container & view state
  const mapWrapperRef = useRef(null);
  const [activeLayer, setActiveLayer] = useState('standard');
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState('All');
  const [activeProperty, setActiveProperty] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);

  // Real-Time User Geolocation state
  const [userPosition, setUserPosition] = useState(null);
  const [userHeading, setUserHeading] = useState(null);
  const [userSpeed, setUserSpeed] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(null);
  const [userAltitude, setUserAltitude] = useState(null);
  const [lastUpdated, setLastUpdated] = useState('');
  const [trackingStatus, setTrackingStatus] = useState('searching'); // searching | active | denied | unavailable | paused
  const [geoErrorMsg, setGeoErrorMsg] = useState('');
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [pathHistory, setPathHistory] = useState([]);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Search by place name state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMarker, setSearchMarker] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Custom User Pins
  const [dropPinMode, setDropPinMode] = useState(false);
  const [customPins, setCustomPins] = useState([]);

  // Watcher ID reference for geolocation
  const watchIdRef = useRef(null);

  // Start continuous watchPosition
  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setTrackingStatus('unavailable');
      setGeoErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setTrackingStatus('searching');
    setGeoErrorMsg('');

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const newPos = [lat, lng];

          setUserPosition(newPos);
          setUserHeading(pos.coords.heading);
          setUserSpeed(pos.coords.speed);
          setUserAccuracy(pos.coords.accuracy);
          setUserAltitude(pos.coords.altitude);
          setLastUpdated(new Date().toLocaleTimeString());
          setTrackingStatus('active');
          setGeoErrorMsg('');

          // Append to movement path if moved more than 2.5 meters
          setPathHistory((prev) => {
            if (prev.length === 0) return [newPos];
            const last = prev[prev.length - 1];
            const dist = getDistanceMeters(last[0], last[1], lat, lng);
            if (dist >= 2.5) {
              return [...prev, newPos];
            }
            return prev;
          });
        },
        (err) => {
          console.warn('Geolocation watch error:', err.message);
          if (err.code === 1) {
            setTrackingStatus('denied');
            setGeoErrorMsg('Location permission denied in browser.');
          } else if (err.code === 2) {
            setTrackingStatus('unavailable');
            setGeoErrorMsg('GPS / Network position unavailable.');
          } else if (err.code === 3) {
            setTrackingStatus('unavailable');
            setGeoErrorMsg('Location request timed out.');
          } else {
            setTrackingStatus('unavailable');
            setGeoErrorMsg(err.message || 'Location error.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        }
      );
    } catch (e) {
      setTrackingStatus('unavailable');
      setGeoErrorMsg(e.message);
    }
  }, []);

  // Stop continuous watchPosition
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingStatus('paused');
    setIsFollowingUser(false);
  }, []);

  // Initialize tracking on mount, cleanup on unmount
  useEffect(() => {
    startTracking();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [startTracking]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Recenter to user's position
  const handleRecenter = () => {
    if (userPosition) {
      setIsFollowingUser(true);
      setFlyTarget({ coords: userPosition, zoom: 16 });
    } else {
      startTracking();
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    if (!mapWrapperRef.current) return;
    if (!document.fullscreenElement) {
      mapWrapperRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Search input handler with debounced Nominatim OpenStreetMap queries
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!val.trim() || val.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            val
          )}&limit=5&addressdetails=1`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch {
        // network error / ignore
      } finally {
        setIsSearching(false);
      }
    }, 450);
  };

  // Select a search place suggestion
  const handleSelectSearchPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      const coords = [lat, lon];
      setSearchMarker({
        coords,
        title: place.display_name.split(',')[0],
        fullName: place.display_name,
      });
      setSearchResults([]);
      setSearchQuery(place.display_name.split(',')[0]);
      setIsFollowingUser(false);
      setFlyTarget({ coords, zoom: 15 });
    }
  };

  // Custom pin dropped by user on map click
  const handleMapClick = (latlng) => {
    const newPin = {
      id: Date.now(),
      lat: latlng.lat,
      lng: latlng.lng,
      label: `Survey Mark #${customPins.length + 1}`,
      time: new Date().toLocaleTimeString(),
    };
    setCustomPins((prev) => [...prev, newPin]);
  };

  // Delete a dropped surveyor pin
  const handleDeleteCustomPin = (id) => {
    setCustomPins((prev) => prev.filter((p) => p.id !== id));
  };

  // Clear movement trail
  const handleClearPath = () => {
    setPathHistory([]);
  };

  // Copy coordinates to clipboard
  const handleCopyCoords = () => {
    if (!userPosition) return;
    const text = `${userPosition[0].toFixed(5)}, ${userPosition[1].toFixed(5)}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    });
  };

  // City corridor filter
  const handleSelectCity = (cityName) => {
    setSelectedCity(cityName);
    setIsFollowingUser(false);
    const target = REGION_CENTERS[cityName] || REGION_CENTERS.All;
    setFlyTarget({ coords: target.center, zoom: target.zoom });
  };

  // Filter properties
  const filteredProperties = useMemo(() => {
    if (selectedCity === 'All') return properties;
    return properties.filter((p) =>
      p.location.toLowerCase().includes(selectedCity.toLowerCase())
    );
  }, [properties, selectedCity]);

  // Click a property card in rail
  const handleSelectRailProperty = (property, coords) => {
    setActiveProperty(property);
    setIsFollowingUser(false);
    setFlyTarget({ coords, zoom: 16 });
  };

  return (
    <section className="map-explorer-section">
      {/* Section Header */}
      <div className="section-header-block">
        <div>
          <div className="hero-eyebrow">
            <span className="eyebrow-pill">REAL-TIME GEOSPATIAL ENGINE</span>
            <span className="eyebrow-note">LEAFLET &amp; GPS TELEMETRY</span>
          </div>
          <h1>Interactive Map Explorer</h1>
          <p className="section-subtext">
            Explore verified land parcels with live GPS location tracking, satellite overlays, and search geocoding.
          </p>
        </div>

        {/* City Filter Pills */}
        <div className="city-filter-buttons">
          {Object.keys(REGION_CENTERS).map((city) => (
            <button
              key={city}
              type="button"
              className={`city-pill ${selectedCity === city ? 'active' : ''}`}
              onClick={() => handleSelectCity(city)}
            >
              {city} Corridors
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Real Leaflet Map + Properties Rail */}
      <div className="map-layout-grid">
        {/* Real Leaflet Map Container */}
        <div
          ref={mapWrapperRef}
          className={`real-map-container-wrapper ${isFullscreen ? 'is-fullscreen' : ''}`}
        >
          {/* Floating Glassmorphism Search Bar */}
          <div className="map-floating-search-bar">
            <div className="search-input-wrapper">
              <span className="search-icon-prefix">
                {isSearching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
              </span>
              <input
                type="text"
                className="map-search-input"
                placeholder="Search place, survey landmark, city..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchResults.length > 0) {
                    handleSelectSearchPlace(searchResults[0]);
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setSearchMarker(null);
                  }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map((result) => (
                  <div
                    key={result.place_id}
                    className="search-result-item"
                    onClick={() => handleSelectSearchPlace(result)}
                  >
                    <MapPin size={14} />
                    <div className="search-result-text">
                      <strong>{result.display_name.split(',')[0]}</strong>
                      <span>{result.display_name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Floating Actions Stack (Top Right) */}
          <div className="map-floating-actions-stack">
            {/* Layer Switcher Button */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`glass-action-btn ${layerMenuOpen ? 'active' : ''}`}
                onClick={() => setLayerMenuOpen(!layerMenuOpen)}
                title="Change Map Layers"
              >
                <Layers size={14} />
                <span>{MAP_LAYERS[activeLayer]?.name || 'Layers'}</span>
              </button>

              {layerMenuOpen && (
                <div className="layer-menu-dropdown">
                  {Object.values(MAP_LAYERS).map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      className={`layer-option-btn ${activeLayer === layer.id ? 'selected' : ''}`}
                      onClick={() => {
                        setActiveLayer(layer.id);
                        setLayerMenuOpen(false);
                      }}
                    >
                      <span>{layer.name}</span>
                      {activeLayer === layer.id && <Check size={12} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Recenter to User Location */}
            <button
              type="button"
              className={`glass-action-btn ${isFollowingUser ? 'active' : ''}`}
              onClick={handleRecenter}
              title={userPosition ? 'Recenter to your live position' : 'Acquire GPS location'}
            >
              <LocateFixed size={14} />
              <span>{isFollowingUser ? 'Following You' : 'Recenter GPS'}</span>
            </button>

            {/* Pin Dropping Tool */}
            <button
              type="button"
              className={`glass-action-btn ${dropPinMode ? 'active' : ''}`}
              onClick={() => setDropPinMode(!dropPinMode)}
              title="Click anywhere on the map to place a surveyor pin"
            >
              <Crosshair size={14} />
              <span>{dropPinMode ? 'Pinning Mode' : 'Drop Pin'}</span>
            </button>

            {/* Tracking Toggle (Play/Pause) */}
            <button
              type="button"
              className="glass-action-btn"
              onClick={trackingStatus === 'paused' ? startTracking : stopTracking}
              title={trackingStatus === 'paused' ? 'Resume GPS tracking' : 'Pause GPS tracking'}
            >
              {trackingStatus === 'paused' ? <Play size={13} /> : <Pause size={13} />}
              <span>{trackingStatus === 'paused' ? 'Resume GPS' : 'Pause GPS'}</span>
            </button>

            {/* Clear Movement Path (if trail exists) */}
            {pathHistory.length > 0 && (
              <button
                type="button"
                className="glass-action-btn"
                onClick={handleClearPath}
                title="Clear current movement breadcrumbs trail"
              >
                <Trash2 size={13} />
                <span>Clear Trail ({pathHistory.length})</span>
              </button>
            )}

            {/* Fullscreen Button */}
            <button
              type="button"
              className="glass-action-btn icon-only-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>

          {/* Leaflet MapContainer */}
          <MapContainer
            center={REGION_CENTERS[selectedCity]?.center || [11.0168, 76.9558]}
            zoom={REGION_CENTERS[selectedCity]?.zoom || 11}
            scrollWheelZoom={true}
            className="leaflet-map-canvas"
          >
            {/* Base Tile Layer */}
            <TileLayer
              key={activeLayer}
              url={MAP_LAYERS[activeLayer].url}
              attribution={MAP_LAYERS[activeLayer].attribution}
              maxZoom={MAP_LAYERS[activeLayer].maxZoom}
            />

            {/* Map Sub-controller for camera movement and click events */}
            <MapController
              userPosition={userPosition}
              isFollowingUser={isFollowingUser}
              flyTarget={flyTarget}
              dropPinMode={dropPinMode}
              onMapClick={handleMapClick}
              onUserManualPan={() => setIsFollowingUser(false)}
            />

            {/* User Movement Breadcrumbs Polyline */}
            {pathHistory.length > 1 && (
              <Polyline
                positions={pathHistory}
                pathOptions={{
                  color: '#2563EB',
                  weight: 4,
                  opacity: 0.85,
                  dashArray: '6, 8',
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}

            {/* Live User Location Marker */}
            {userPosition && (
              <Marker
                position={userPosition}
                icon={createUserMarkerIcon(userHeading)}
              >
                <Popup className="user-popup">
                  <div className="user-popup-content">
                    <strong>Your Live Position</strong>
                    <p>Lat: {userPosition[0].toFixed(6)}°</p>
                    <p>Lng: {userPosition[1].toFixed(6)}°</p>
                    {userAccuracy && <p>Accuracy: &plusmn;{Math.round(userAccuracy)}m</p>}
                    {userSpeed !== null && (
                      <p>Speed: {(userSpeed * 3.6).toFixed(1)} km/h</p>
                    )}
                    {userHeading !== null && (
                      <p>Heading: {getHeadingCardinal(userHeading)}</p>
                    )}
                    <p>Updated: {lastUpdated || 'Live'}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Search Landmark Marker */}
            {searchMarker && (
              <Marker position={searchMarker.coords} icon={createSearchPinIcon()}>
                <Popup>
                  <div style={{ padding: '8px 10px' }}>
                    <strong style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                      {searchMarker.title}
                    </strong>
                    <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>
                      {searchMarker.fullName}
                    </p>
                    <p style={{ fontSize: '10px', color: '#888', marginTop: '4px', fontFamily: 'monospace' }}>
                      {searchMarker.coords[0].toFixed(5)}, {searchMarker.coords[1].toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Custom Dropped Surveyor Pins */}
            {customPins.map((pin, idx) => (
              <Marker
                key={pin.id}
                position={[pin.lat, pin.lng]}
                icon={createCustomPinIcon(idx + 1)}
              >
                <Popup>
                  <div className="custom-pin-popup">
                    <h5>{pin.label}</h5>
                    <p style={{ fontSize: '11px', fontFamily: 'monospace', margin: '2px 0' }}>
                      {pin.lat.toFixed(6)}°, {pin.lng.toFixed(6)}°
                    </p>
                    <span style={{ fontSize: '10px', color: '#888' }}>
                      Placed at {pin.time}
                    </span>
                    <button
                      type="button"
                      className="pin-delete-btn"
                      onClick={() => handleDeleteCustomPin(pin.id)}
                    >
                      <Trash2 size={11} />
                      <span>Remove Marker</span>
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Property Markers */}
            {filteredProperties.map((prop, idx) => {
              const coords = getPropertyCoordinates(prop, idx);
              const isSelected = activeProperty?.id === prop.id;

              return (
                <Marker
                  key={prop.id}
                  position={coords}
                  icon={createPropertyMarkerIcon(prop, isSelected)}
                  eventHandlers={{
                    click: () => {
                      setActiveProperty(prop);
                      setIsFollowingUser(false);
                    },
                  }}
                >
                  <Popup>
                    <div className="map-popup-card">
                      <img
                        src={prop.image}
                        alt={prop.title}
                        className="map-popup-thumb"
                      />
                      <div className="map-popup-body">
                        <div className="map-popup-title">{prop.title}</div>
                        <span className="map-popup-location">{prop.location}</span>
                        <div className="map-popup-meta">
                          <span className="map-popup-price">
                            ₹
                            {prop.price >= 10000000
                              ? `${(prop.price / 10000000).toFixed(2)} Cr`
                              : `${(prop.price / 100000).toFixed(2)} Lakhs`}
                          </span>
                          <span className="map-popup-area">
                            {prop.area} {prop.area_unit || 'sq.ft'}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="map-popup-btn"
                          onClick={() => {
                            if (onSelectProperty) onSelectProperty(prop);
                          }}
                        >
                          <span>View Parcel Details</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Bottom Live Telemetry HUD */}
          <div className="map-telemetry-hud">
            <div className="telemetry-primary-group">
              {/* Coordinates */}
              <div className="telemetry-item">
                <span className="label">Live Coordinates</span>
                <span className="value">
                  {userPosition ? (
                    <>
                      <span>
                        {userPosition[0].toFixed(5)}°, {userPosition[1].toFixed(5)}°
                      </span>
                      <button
                        type="button"
                        className="coord-copy-btn"
                        onClick={handleCopyCoords}
                        title="Copy coordinates"
                      >
                        {copiedCoords ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                      </button>
                    </>
                  ) : (
                    <span>Acquiring GPS...</span>
                  )}
                </span>
              </div>

              {/* Speed */}
              <div className="telemetry-item">
                <span className="label">Movement Speed</span>
                <span className="value">
                  {userSpeed !== null && !Number.isNaN(userSpeed)
                    ? `${(userSpeed * 3.6).toFixed(1)} km/h`
                    : '0.0 km/h'}
                </span>
              </div>

              {/* Heading */}
              <div className="telemetry-item">
                <span className="label">Compass Direction</span>
                <span className="value">
                  <Compass size={13} />
                  <span>{getHeadingCardinal(userHeading)}</span>
                </span>
              </div>

              {/* GPS Accuracy */}
              <div className="telemetry-item">
                <span className="label">Accuracy</span>
                <span className="value">
                  {userAccuracy ? `\u00B1${Math.round(userAccuracy)}m` : '--'}
                </span>
              </div>

              {/* Waypoints */}
              {pathHistory.length > 0 && (
                <div className="telemetry-item">
                  <span className="label">Path Trail</span>
                  <span className="value">{pathHistory.length} pts</span>
                </div>
              )}
            </div>

            {/* Status Indicator Badge */}
            <div className={`telemetry-status-badge ${trackingStatus}`}>
              <span className="status-dot-pulse" />
              <span>
                {trackingStatus === 'active'
                  ? 'GPS Active'
                  : trackingStatus === 'searching'
                  ? 'Locating...'
                  : trackingStatus === 'paused'
                  ? 'Tracking Paused'
                  : trackingStatus === 'denied'
                  ? 'Permission Denied'
                  : 'GPS Unavailable'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Parcel Cards List */}
        <div className="map-properties-rail">
          <div className="rail-header">
            <h4>Verified Land Parcels ({filteredProperties.length})</h4>
            <span>Click any parcel to pan map</span>
          </div>

          <div className="rail-cards-scroll">
            {filteredProperties.map((property, idx) => {
              const coords = getPropertyCoordinates(property, idx);
              const isActive = activeProperty?.id === property.id;

              return (
                <div
                  key={property.id}
                  className={`rail-property-card ${isActive ? 'active' : ''}`}
                  onClick={() => handleSelectRailProperty(property, coords)}
                >
                  <img
                    src={property.image}
                    alt={property.title}
                    className="rail-card-img"
                  />
                  <div className="rail-card-body">
                    <strong>{property.title}</strong>
                    <span className="rail-location">{property.location}</span>
                    <div className="rail-meta-row">
                      <span className="rail-price">
                        ₹
                        {property.price >= 10000000
                          ? `${(property.price / 10000000).toFixed(2)} Cr`
                          : `₹${(property.price / 100000).toFixed(2)} L`}
                      </span>
                      <span className="rail-area">
                        {property.area} {property.area_unit || 'sq.ft'}
                      </span>
                    </div>
                    <div className="rail-verify-tag">
                      <ShieldCheck size={12} />
                      <span>
                        {property.verified
                          ? 'Cadastral Verified'
                          : 'Survey In Review'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
