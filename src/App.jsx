import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

// Components
import Navigation from './components/Navigation';
import { apiUrl } from './services/api.js';
import AuthModal from './components/AuthModal';
import Hero from './components/Hero';
import PropertyCard from './components/PropertyCard';
import PropertyModal from './components/PropertyModal';
import DocumentVerification from './components/DocumentVerification';
import MapExplorer from './components/MapExplorer';
import AiAssistant from './components/AiAssistant';
import CostEstimator from './components/CostEstimator';
import SavedProperties from './components/SavedProperties';
import SellerDashboard from './components/SellerDashboard';
import SellerMyListings from './components/SellerMyListings';
import AddPropertyForm from './components/AddPropertyForm';
import House3DSection from './components/House3DSection';
import { TemplateGalleryModal } from './archicraft/components/TemplateGalleryModal';
import { useStudioStore } from './archicraft/store/useStudioStore';

const StudioLayout = React.lazy(() =>
  import('./archicraft/StudioLayout').then((mod) => ({ default: mod.StudioLayout }))
);

import {
  Building2,
  SlidersHorizontal,
  ArrowUpDown,
  Search,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function App() {
  // Navigation & Page State
  // Route: 'home' (/) | 'studio' (/studio)
  const [activeRoute, setActiveRoute] = useState(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/studio' || hash === '#studio') return 'studio';
    return 'home';
  });

  // 'home' | 'archicraft' | 'properties' | 'map' | 'verification' | 'ai-assistant' | 'estimator' | 'saved'
  // | 'seller-dashboard' | 'seller-listings'
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/studio' || hash === '#studio') return 'archicraft';
    return 'home';
  });

  // Handle URL history / Back / Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/studio' || hash === '#studio') {
        setActiveRoute('studio');
        setActiveTab('archicraft');
      } else {
        setActiveRoute('home');
        if (activeTab === 'archicraft') {
          setActiveTab('home');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeTab]);

  const handleOpenStudio = () => {
    window.history.pushState({}, '', '/studio');
    setActiveRoute('studio');
    setActiveTab('archicraft');
  };

  const handleBackToLanding = () => {
    window.history.pushState({}, '', '/');
    setActiveRoute('home');
    setActiveTab('home');
  };

  const handleTabChange = (tab) => {
    if (tab === 'archicraft') {
      window.history.pushState({}, '', '/studio');
      setActiveRoute('studio');
      setActiveTab('archicraft');
    } else {
      if (window.location.pathname === '/studio') {
        window.history.pushState({}, '', '/');
      }
      setActiveRoute('home');
      setActiveTab(tab);
    }
  };

  // User Authentication State
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');

  // Seller Add Property Form
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);

  // Property Catalog State
  const [properties, setProperties] = useState([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState('');

  // Selected Property for Details Modal
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Saved Properties state
  const [savedPropertyIds, setSavedPropertyIds] = useState(new Set());
  const [savedPropertiesList, setSavedPropertiesList] = useState([]);

  // Search & Filter State
  const [filters, setFilters] = useState({
    location: '',
    type: '',
    minPrice: '',
    maxPrice: '',
    minArea: '',
    query: '',
    sort: 'score_desc', // 'score_desc' | 'price_asc' | 'price_desc' | 'area_desc' | 'newest'
  });

  // Check authenticated session on mount
  useEffect(() => {
    checkCurrentUser();
  }, []);

  const checkCurrentUser = async () => {
    const token = localStorage.getItem('landai_token');
    if (!token) return;

    try {
      const res = await fetch(apiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('landai_token');
      }
    } catch {
      // offline / degraded
    }
  };

  // Load properties from backend
  useEffect(() => {
    fetchProperties();
  }, [user]);

  const fetchProperties = async () => {
    setPropertiesLoading(true);
    setPropertiesError('');

    try {
      const token = localStorage.getItem('landai_token');
      const res = await fetch(apiUrl('/api/properties?pageSize=50'), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve properties');
      }

      const data = await res.json();
      const list = data.properties || [];
      setProperties(list);

      // Track saved IDs
      const savedSet = new Set(list.filter((p) => p.saved).map((p) => p.id));
      setSavedPropertyIds(savedSet);
    } catch (err) {
      setPropertiesError(err.message || 'Could not load properties catalog.');
    } finally {
      setPropertiesLoading(false);
    }
  };

  // Sync saved list whenever user changes
  useEffect(() => {
    if (!user) {
      setSavedPropertiesList([]);
      return;
    }

    const token = localStorage.getItem('landai_token');
    fetch(apiUrl('/api/saved'), {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : { properties: [] }))
      .then((data) => {
        const saved = data.properties || [];
        setSavedPropertiesList(saved);
        setSavedPropertyIds(new Set(saved.map((p) => p.id)));
      })
      .catch(() => {});
  }, [user, savedPropertyIds.size]);

  // Handle Save / Favorite Toggle
  const handleToggleSave = async (propertyId) => {
    if (!user) {
      setAuthInitialMode('login');
      setAuthModalOpen(true);
      return;
    }

    const isCurrentlySaved = savedPropertyIds.has(propertyId);
    const method = isCurrentlySaved ? 'DELETE' : 'POST';

    // Optimistic UI update
    setSavedPropertyIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlySaved) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });

    try {
      const token = localStorage.getItem('landai_token');
      const res = await fetch(apiUrl(`/api/saved/${propertyId}`), {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Could not update saved status');
    } catch {
      // Revert optimistic update on failure
      setSavedPropertyIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlySaved) next.add(propertyId);
        else next.delete(propertyId);
        return next;
      });
    }
  };

  // Handle Sign Out
  const handleLogout = async () => {
    try {
      await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' });
    } catch {
      // ignore
    }
    localStorage.removeItem('landai_token');
    setUser(null);
    setSavedPropertyIds(new Set());
    setSavedPropertiesList([]);
    setActiveTab('home');
  };

  // Filter updates
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Filtered & Sorted Properties List
  const filteredProperties = useMemo(() => {
    return properties
      .filter((p) => {
        // Query / Title / Location matching
        const q = (filters.query || '').toLowerCase().trim();
        if (q) {
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchLoc = p.location.toLowerCase().includes(q);
          const matchTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchLoc && !matchTags) return false;
        }

        // Location filter from hero
        if (filters.location) {
          if (!p.location.toLowerCase().includes(filters.location.toLowerCase().trim())) {
            return false;
          }
        }

        // Property Type
        if (filters.type) {
          if (p.type.toLowerCase() !== filters.type.toLowerCase()) {
            return false;
          }
        }

        // Max Budget
        if (filters.maxPrice) {
          if (p.price > Number(filters.maxPrice)) {
            return false;
          }
        }

        // Min Land Area
        if (filters.minArea) {
          if (p.area < Number(filters.minArea)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sort === 'price_asc') return a.price - b.price;
        if (filters.sort === 'price_desc') return b.price - a.price;
        if (filters.sort === 'area_desc') return b.area - a.area;
        if (filters.sort === 'newest') return b.id - a.id;
        // Default: score_desc
        return (b.score || 0) - (a.score || 0);
      });
  }, [properties, filters]);

  // Seller tab guard
  const handleSellerTab = (tab) => {
    if (!user) {
      setAuthInitialMode('login');
      setAuthModalOpen(true);
      return;
    }
    if (user.role !== 'seller') {
      alert('This area is for seller accounts. Please register as a seller to list properties.');
      return;
    }
    setActiveTab(tab);
  };

  if (activeTab === 'archicraft' || activeRoute === 'studio') {
    return (
      <React.Suspense
        fallback={
          <div className="min-h-screen bg-[#070a10] flex flex-col items-center justify-center text-slate-300">
            <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
            <span className="font-semibold text-sm tracking-wide">
              Initializing ArchiCraft 3D CAD/BIM Studio…
            </span>
          </div>
        }
      >
        <StudioLayout onBackToMain={handleBackToLanding} />
      </React.Suspense>
    );
  }

  return (
    <div className="terra-app-root">
      {/* 1. Global Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        user={user}
        onOpenAuth={(initialMode = 'login') => {
          setAuthInitialMode(initialMode);
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenCreateListing={() => {
          if (!user) {
            setAuthInitialMode('login');
            setAuthModalOpen(true);
            return;
          }
          if (user.role !== 'seller') {
            alert('You need a seller account to list properties.');
            return;
          }
          setAddPropertyOpen(true);
        }}
        onOpenSellerDashboard={() => handleSellerTab('seller-dashboard')}
        onOpenMyListings={() => handleSellerTab('seller-listings')}
        savedCount={savedPropertyIds.size}
      />

      {/* 2. Main Page Views */}
      <main className="terra-main-view">
        {/* VIEW A: HOME / LANDING PAGE */}
        {activeTab === 'home' && (
          <div className="home-view-container animate-fade">
            {/* Hero Section */}
            <Hero
              filters={filters}
              onFilterChange={handleFilterChange}
              onSearch={() => {
                const elem = document.getElementById('marketplace-anchor');
                elem?.scrollIntoView({ behavior: 'smooth' });
              }}
              totalProperties={properties.length}
              onNavigateVerify={() => setActiveTab('verification')}
            />

            {/* Integrated 3D House Modeling Architectural Section */}
            <House3DSection
              onOpenStudio={handleOpenStudio}
              onOpenTemplates={() => useStudioStore.getState().setTemplateModalOpen(true)}
            />

            {/* Recommended Properties Marketplace Section */}
            <section id="marketplace-anchor" className="marketplace-section">
              <div className="marketplace-header-row">
                <div>
                  <div className="hero-eyebrow">
                    <span className="eyebrow-pill">CURATED INVENTORY</span>
                    <span className="eyebrow-note">VERIFIED TITLE DEEDS</span>
                  </div>
                  <h2>Recommended Properties</h2>
                  <p className="marketplace-sub">
                    Land parcels and residences with verified survey numbers, patta records, and transparent pricing.
                  </p>
                </div>

                {/* Filter and Sort Toolbar */}
                <div className="marketplace-controls-toolbar">
                  {/* Property Type Filter */}
                  <div className="filter-pill-select">
                    <SlidersHorizontal size={14} />
                    <select
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                    >
                      <option value="">All Categories</option>
                      <option value="Plot">Plot / Land</option>
                      <option value="Residential">Residential Site</option>
                      <option value="Villa">Independent Villa</option>
                      <option value="Commercial">Commercial Land</option>
                    </select>
                  </div>

                  {/* Sort Order Selector */}
                  <div className="sort-pill-select">
                    <ArrowUpDown size={14} />
                    <select
                      value={filters.sort}
                      onChange={(e) => handleFilterChange('sort', e.target.value)}
                    >
                      <option value="score_desc">Recommended Score</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="area_desc">Plot Area: Large First</option>
                      <option value="newest">Newest First</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Properties Grid */}
              {propertiesLoading ? (
                <div className="properties-loading-card">
                  <RefreshCw size={24} className="spin-icon" />
                  <span>Loading available properties catalog…</span>
                </div>
              ) : filteredProperties.length > 0 ? (
                <div className="properties-catalog-grid">
                  {filteredProperties.map((prop) => (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      isSaved={savedPropertyIds.has(prop.id)}
                      onToggleSave={handleToggleSave}
                      onSelect={(p) => setSelectedProperty(p)}
                    />
                  ))}
                </div>
              ) : (
                <div className="properties-empty-state">
                  <div className="empty-search-icon">
                    <Search size={32} />
                  </div>
                  <h3>No properties match your active filter criteria</h3>
                  <p>Try clearing your budget or location filter to browse the complete catalog.</p>
                  <button
                    type="button"
                    className="clear-filters-btn"
                    onClick={() => {
                      setFilters({
                        location: '',
                        type: '',
                        minPrice: '',
                        maxPrice: '',
                        minArea: '',
                        query: '',
                        sort: 'score_desc',
                      });
                    }}
                  >
                    Reset All Filters
                  </button>
                </div>
              )}
            </section>

            {/* Quick Feature Strip */}
            <section className="features-highlight-strip">
              <div className="feature-item-box">
                <div className="feature-icon">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <strong>Bilingual Document Verification</strong>
                  <p>OCR engine processes both English and Tamil land records with survey number cross-checks.</p>
                </div>
              </div>

              <div className="feature-item-box">
                <div className="feature-icon">
                  <Sparkles size={20} />
                </div>
                <div>
                  <strong>Intelligent AI Recommendation</strong>
                  <p>Multi-attribute ranking matches your location, budget, and DTCP/CMDA zoning preferences.</p>
                </div>
              </div>

              <div className="feature-item-box">
                <div className="feature-icon">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <strong>Direct Seller Transparency</strong>
                  <p>No arbitrary broker markups. Direct contact, schedule visits, and inspect title deeds.</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW B: FULL PROPERTIES CATALOG */}
        {activeTab === 'properties' && (
          <div className="catalog-view-container animate-fade">
            {/* Page Header */}
            <div className="catalog-page-header">
              <div className="catalog-header-text">
                <div className="hero-eyebrow">
                  <span className="eyebrow-pill">MARKETPLACE DIRECTORY</span>
                  <span className="eyebrow-note">{filteredProperties.length} AVAILABLE</span>
                </div>
                <h1>All Property Listings</h1>
                <p className="catalog-subtext">
                  Browse residential plots, agricultural land, and properties available for sale.
                </p>
              </div>
            </div>

            {/* Search + Filter Toolbar */}
            <div className="catalog-toolbar">
              {/* Search Input */}
              <div className="catalog-search-field">
                <Search size={15} />
                <input
                  id="catalog-search-input"
                  type="text"
                  value={filters.query}
                  onChange={(e) => handleFilterChange('query', e.target.value)}
                  placeholder="Search by title, street, locality or tag…"
                />
              </div>

              {/* Type */}
              <div className="catalog-filter-control">
                <select
                  id="catalog-type-filter"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Plot">Plot / Land</option>
                  <option value="Residential">Residential</option>
                  <option value="Villa">Villa</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Agricultural">Agricultural</option>
                  <option value="Apartment">Apartment</option>
                  <option value="House">House</option>
                </select>
              </div>

              {/* Budget */}
              <div className="catalog-filter-control">
                <select
                  id="catalog-budget-filter"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                >
                  <option value="">Any Budget</option>
                  <option value="3000000">Under ₹30 L</option>
                  <option value="5000000">Under ₹50 L</option>
                  <option value="10000000">Under ₹1 Cr</option>
                  <option value="20000000">Under ₹2 Cr</option>
                  <option value="50000000">Under ₹5 Cr</option>
                </select>
              </div>

              {/* Min Area */}
              <div className="catalog-filter-control">
                <select
                  id="catalog-area-filter"
                  value={filters.minArea}
                  onChange={(e) => handleFilterChange('minArea', e.target.value)}
                >
                  <option value="">Any Area</option>
                  <option value="600">600+ sq.ft</option>
                  <option value="1200">1,200+ sq.ft</option>
                  <option value="1800">1,800+ sq.ft</option>
                  <option value="2400">2,400+ sq.ft</option>
                  <option value="4800">4,800+ sq.ft</option>
                </select>
              </div>

              {/* Sort */}
              <div className="catalog-filter-control">
                <select
                  id="catalog-sort"
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                >
                  <option value="score_desc">Best Match</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="area_desc">Area: Large First</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>

              {/* Reset */}
              {(filters.query || filters.type || filters.maxPrice || filters.minArea) && (
                <button
                  className="catalog-reset-btn"
                  onClick={() => setFilters((p) => ({ ...p, query: '', type: '', maxPrice: '', minArea: '' }))}
                  id="catalog-reset-filters"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Result count */}
            <div className="catalog-result-count">
              {filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'} found
            </div>

            {/* Properties Grid */}
            {propertiesLoading ? (
              <div className="properties-loading-card">
                <RefreshCw size={24} className="spin-icon" />
                <span>Loading available properties catalog…</span>
              </div>
            ) : filteredProperties.length > 0 ? (
              <div className="properties-catalog-grid">
                {filteredProperties.map((prop) => (
                  <PropertyCard
                    key={prop.id}
                    property={prop}
                    isSaved={savedPropertyIds.has(prop.id)}
                    onToggleSave={handleToggleSave}
                    onSelect={(p) => setSelectedProperty(p)}
                  />
                ))}
              </div>
            ) : (
              <div className="properties-empty-state">
                <div className="empty-search-icon">
                  <Search size={32} />
                </div>
                <h3>No properties found matching your search</h3>
                <p>Try relaxing your filters or search keywords.</p>
                <button
                  className="clear-filters-btn"
                  onClick={() => setFilters((p) => ({ ...p, query: '', type: '', maxPrice: '', minArea: '' }))}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW C: MAP EXPLORER */}
        {activeTab === 'map' && (
          <div className="map-view-wrapper animate-fade">
            <MapExplorer properties={properties} onSelectProperty={(p) => setSelectedProperty(p)} onRefreshProperties={fetchProperties} />
          </div>
        )}

        {/* VIEW D: DOCUMENT VERIFICATION (REAL OCR) */}
        {activeTab === 'verification' && (
          <div className="verify-view-wrapper animate-fade">
            <DocumentVerification
              user={user}
              onOpenAuth={(mode = 'login') => {
                setAuthInitialMode(mode);
                setAuthModalOpen(true);
              }}
            />
          </div>
        )}

        {/* VIEW E: AI PROPERTY ASSISTANT */}
        {activeTab === 'ai-assistant' && (
          <div className="assistant-view-wrapper animate-fade">
            <AiAssistant
              onNavigateVerification={() => setActiveTab('verification')}
            />
          </div>
        )}

        {/* VIEW F: COST ESTIMATOR */}
        {activeTab === 'estimator' && (
          <div className="estimator-view-wrapper animate-fade">
            <CostEstimator />
          </div>
        )}

        {/* VIEW G: SAVED PROPERTIES */}
        {activeTab === 'saved' && (
          <div className="saved-view-wrapper animate-fade">
            <SavedProperties
              savedProperties={savedPropertiesList}
              onSelectProperty={(p) => setSelectedProperty(p)}
              onRemoveSaved={handleToggleSave}
              onExploreProperties={() => setActiveTab('properties')}
              user={user}
              onOpenAuth={(mode = 'login') => {
                setAuthInitialMode(mode);
                setAuthModalOpen(true);
              }}
            />
          </div>
        )}

        {/* VIEW H: SELLER DASHBOARD */}
        {activeTab === 'seller-dashboard' && (
          <div className="seller-view-wrapper animate-fade">
            <SellerDashboard
              user={user}
              onOpenAddProperty={() => {
                setEditingProperty(null);
                setAddPropertyOpen(true);
              }}
              onOpenMyListings={() => setActiveTab('seller-listings')}
              onSelectProperty={(p) => setSelectedProperty(p)}
              onEditProperty={(prop) => {
                setEditingProperty(prop);
                setAddPropertyOpen(true);
              }}
              onListingChanged={fetchProperties}
            />
          </div>
        )}

        {/* VIEW I: SELLER MY LISTINGS */}
        {activeTab === 'seller-listings' && (
          <div className="seller-view-wrapper animate-fade">
            <SellerMyListings
              user={user}
              onSelectProperty={(p) => setSelectedProperty(p)}
              onEditProperty={(prop) => {
                setEditingProperty(prop);
                setAddPropertyOpen(true);
              }}
              onListingChanged={fetchProperties}
            />
          </div>
        )}
      </main>

      {/* 3. Global Modals */}
      {/* Property Details Modal */}
      <PropertyModal
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
        isSaved={selectedProperty ? savedPropertyIds.has(selectedProperty.id) : false}
        onToggleSave={handleToggleSave}
        user={user}
        onOpenAuth={(mode = 'login') => {
          setAuthInitialMode(mode);
          setAuthModalOpen(true);
        }}
        onNavigateVerify={() => setActiveTab('verification')}
      />

      {/* Auth Modal (Login & Registration) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authInitialMode}
        onAuthenticated={(authenticatedUser, wasRegistration = false) => {
          setUser(authenticatedUser);
          fetchProperties();
          if (authenticatedUser?.role === 'seller') {
            setActiveTab('seller-dashboard');
          } else if (authenticatedUser?.role === 'buyer') {
            setActiveTab('properties');
          }
        }}
      />

      {/* Add / Edit Property Form */}
      {addPropertyOpen && (
        <AddPropertyForm
          user={user}
          initialProperty={editingProperty}
          onClose={() => {
            setAddPropertyOpen(false);
            setEditingProperty(null);
          }}
          onPropertyCreated={(newProp, status) => {
            setAddPropertyOpen(false);
            setEditingProperty(null);
            fetchProperties();
            setActiveTab('seller-listings');
          }}
        />
      )}

      {/* Template Gallery Modal for 3D Architecture */}
      <TemplateGalleryModal />

      {/* 4. Global Footer */}
      <footer className="terra-footer">
        <div className="footer-content-wrap">
          <div className="footer-col brand-col">
            <div className="terra-brand">
              <div className="brand-symbol">
                <ShieldCheck size={18} />
              </div>
              <span className="brand-name">terra</span>
            </div>
            <p className="footer-tagline">
              Intelligent property discovery and legal document verification platform for South Indian real estate.
            </p>
            <span className="footer-legal-copy">
              &copy; {new Date().getFullYear()} Terra AI Realty. Strict monochrome aesthetic. Zero green.
            </span>
          </div>

          <div className="footer-col">
            <h4>Platform Services</h4>
            <ul>
              <li><button onClick={() => setActiveTab('properties')}>Property Catalog</button></li>
              <li><button onClick={() => setActiveTab('map')}>Cadastral Map</button></li>
              <li><button onClick={() => setActiveTab('verification')}>Document OCR</button></li>
              <li><button onClick={() => setActiveTab('estimator')}>Cost Estimator</button></li>
              <li><button onClick={() => setActiveTab('ai-assistant')}>AI Legal Assistant</button></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Zoning Guidelines</h4>
            <ul>
              <li><span>DTCP Layout Approval</span></li>
              <li><span>CMDA Master Plan</span></li>
              <li><span>Patta Chitta Verification</span></li>
              <li><span>Field Measurement Book (FMB)</span></li>
              <li><span>Encumbrance Certificate (EC)</span></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Compliance &amp; Terms</h4>
            <p className="footer-disclaimer-note">
              Terra provides technical OCR extraction and structural consistency checks. Technical reports do not replace physical verification or official registry certifications at the Sub-Registrar Office.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
