import React, { useState } from 'react';
import {
  Building2,
  Home,
  MapPin,
  FileCheck2,
  Bot,
  Calculator,
  Bookmark,
  User,
  LogOut,
  PlusCircle,
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
  LayoutDashboard,
  List,
  Compass
} from 'lucide-react';

export default function Navigation({
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
  onLogout,
  onOpenCreateListing,
  onOpenSellerDashboard,
  onOpenMyListings,
  savedCount = 0
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'archicraft', label: '3D Studio', icon: Compass, badge: 'PRO' },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'map', label: 'Map Explorer', shortLabel: 'Map', icon: MapPin },
    { id: 'verification', label: 'Document Verification', shortLabel: 'Verification', icon: FileCheck2 },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Bot },
    { id: 'estimator', label: 'Cost Estimator', shortLabel: 'Estimator', icon: Calculator },
    { id: 'saved', label: 'Saved', icon: Bookmark, badge: savedCount > 0 ? savedCount : null },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="terra-header">
      <div className="terra-nav-container">
        {/* Logo */}
        <div className="terra-brand" onClick={() => handleNavClick('home')}>
          <div className="brand-symbol">
            <ShieldCheck size={18} strokeWidth={2.2} />
          </div>
          <span className="brand-name">terra</span>
          <span className="brand-badge">AI PROPERTY</span>
        </div>

        {/* Desktop Nav Items */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon size={15} strokeWidth={1.8} />
                {item.shortLabel ? (
                  <>
                    <span className="nav-label-full">{item.label}</span>
                    <span className="nav-label-short">{item.shortLabel}</span>
                  </>
                ) : (
                  <span>{item.label}</span>
                )}
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </button>
            );
          })}
          {/* Sell Property navigation item */}
          <button
            className={`nav-link ${activeTab === 'seller-dashboard' ? 'active' : ''}`}
            onClick={() => onOpenSellerDashboard?.()}
            id="nav-sell-property"
          >
            <LayoutDashboard size={15} strokeWidth={1.8} />
            <span className="nav-label-full">Sell Property</span>
            <span className="nav-label-short">Sell</span>
          </button>
          {user?.role === 'seller' && (
            <button
              className={`nav-link ${activeTab === 'seller-listings' ? 'active' : ''}`}
              onClick={() => onOpenMyListings?.()}
              id="nav-seller-listings"
            >
              <List size={15} strokeWidth={1.8} />
              <span className="nav-label-full">My Listings</span>
              <span className="nav-label-short">Listings</span>
            </button>
          )}
        </nav>

        {/* User / Actions Section */}
        <div className="nav-actions">
          {user ? (
            <div className="user-profile-menu">
              {user.role === 'seller' && (
                <button
                  className="list-property-btn"
                  onClick={onOpenCreateListing}
                  title="List a new property"
                  id="nav-list-property-btn"
                >
                  <PlusCircle size={15} />
                  <span>List Property</span>
                </button>
              )}

              <div className="user-avatar-trigger" onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}>
                <div className="avatar-circle">
                  {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                </div>
                <div className="user-info-snippet">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role-tag">{user.role}</span>
                </div>
                <ChevronDown size={14} className={`dropdown-arrow ${profileDropdownOpen ? 'rotated' : ''}`} />
              </div>

              {profileDropdownOpen && (
                <div className="profile-dropdown-menu" onMouseLeave={() => setProfileDropdownOpen(false)}>
                  <div className="dropdown-user-header">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setActiveTab('saved');
                      setProfileDropdownOpen(false);
                    }}
                  >
                    <Bookmark size={15} />
                    <span>Saved Properties ({savedCount})</span>
                  </button>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setActiveTab('verification');
                      setProfileDropdownOpen(false);
                    }}
                  >
                    <FileCheck2 size={15} />
                    <span>My Verification Records</span>
                  </button>
                  {user.role === 'seller' && (
                    <>
                      <div className="dropdown-divider" />
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenSellerDashboard?.();
                        }}
                        id="dropdown-seller-dashboard"
                      >
                        <LayoutDashboard size={15} />
                        <span>Seller Dashboard</span>
                      </button>
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          onOpenMyListings?.();
                        }}
                        id="dropdown-my-listings"
                      >
                        <List size={15} />
                        <span>My Listings</span>
                      </button>
                    </>
                  )}
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item danger"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="guest-actions">
              <button className="auth-trigger-btn" onClick={() => onOpenAuth('login')}>
                <User size={15} />
                <span>Sign In</span>
              </button>
              <button className="auth-register-btn" onClick={() => onOpenAuth('register')}>
                <span>Create Account</span>
              </button>
            </div>
          )}

          {/* Mobile hamburger button */}
          <button
            className="mobile-hamburger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <nav className="mobile-nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </button>
              );
            })}
            <button
              className={`mobile-nav-item ${activeTab === 'seller-dashboard' ? 'active' : ''}`}
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSellerDashboard?.();
              }}
            >
              <LayoutDashboard size={18} />
              <span>Sell Property</span>
            </button>
            {user?.role === 'seller' && (
              <button
                className={`mobile-nav-item ${activeTab === 'seller-listings' ? 'active' : ''}`}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenMyListings?.();
                }}
              >
                <List size={18} />
                <span>My Listings</span>
              </button>
            )}
          </nav>
          <div className="mobile-drawer-footer">
            {user ? (
              <div className="mobile-user-actions">
                <div className="mobile-user-details">
                  <div className="avatar-circle">
                    {user.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <strong>{user.name}</strong>
                    <p>{user.email}</p>
                  </div>
                </div>
                {user.role === 'seller' && (
                  <button
                    className="list-property-btn full-width"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenCreateListing();
                    }}
                  >
                    <PlusCircle size={16} />
                    <span>List a Property</span>
                  </button>
                )}
                <button
                  className="mobile-logout-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="mobile-guest-buttons">
                <button
                  className="auth-trigger-btn full-width"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                >
                  <User size={16} />
                  <span>Sign In</span>
                </button>
                <button
                  className="auth-register-btn full-width"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('register');
                  }}
                >
                  <span>Create Account</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
