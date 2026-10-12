import { useState, useEffect, FormEvent } from "react";
import {
  Building2, Users, CalendarDays, Plus, Trash2, CheckCircle2, XCircle,
  Clock, ShieldCheck, MapPin, Layers3, CircleDollarSign, ArrowRight, X, AlertCircle
} from "lucide-react";
import { User, Inquiry } from "../types/auth";

interface PropertyItem {
  id: number;
  title: string;
  location: string;
  price: number;
  area: number;
  type: string;
  score: number;
  image: string;
  verified: boolean;
  tags: string[];
  status?: string;
}

interface SellerDashboardProps {
  user: User;
  onViewMarketplace: () => void;
}

export default function SellerDashboard({ user, onViewMarketplace }: SellerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"listings" | "enquiries">("listings");
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [enquiries, setEnquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");

  // Modal for adding a new property
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addLocation, setAddLocation] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addArea, setAddArea] = useState("");
  const [addType, setAddType] = useState("Residential");
  const [addImage, setAddImage] = useState("");
  const [addTags, setAddTags] = useState("East-facing, Direct Owner");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [propRes, inqRes] = await Promise.all([
        fetch("/api/properties", { credentials: "include" }),
        fetch("/api/inquiries", { credentials: "include" })
      ]);

      if (propRes.ok) {
        const propData = await propRes.json();
        setProperties(propData.properties || []);
      }

      if (inqRes.ok) {
        const inqData = await inqRes.json();
        setEnquiries(inqData.inquiries || []);
      }
    } catch (err) {
      console.error("Error loading seller data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Add Property
  const handleAddProperty = async (e: FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!addTitle.trim() || !addLocation.trim() || !addPrice || !addArea) {
      setAddError("Please fill in all required property details.");
      return;
    }

    setAddLoading(true);
    try {
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: addTitle.trim(),
          location: addLocation.trim(),
          price: parseFloat(addPrice),
          area: parseFloat(addArea),
          type: addType,
          image: addImage.trim() || "https://images.unsplash.com/photo-1505843795480-5cfb3c03f6ff?auto=format&fit=crop&w=1200&q=85",
          tags: addTags.split(",").map(t => t.trim()).filter(Boolean)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create listing.");
      }

      showToast("Property listing created successfully!");
      setShowAddModal(false);
      setAddTitle("");
      setAddLocation("");
      setAddPrice("");
      setAddArea("");
      loadData();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Error creating property.");
    } finally {
      setAddLoading(false);
    }
  };

  // Handle Delete Property
  const handleDeleteProperty = async (id: number) => {
    if (!window.confirm("Are you sure you want to remove this property listing?")) return;

    try {
      const response = await fetch(`/api/properties/${id}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (response.ok) {
        showToast("Property listing deleted.");
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete listing.");
      }
    } catch (err) {
      console.error("Error deleting property:", err);
    }
  };

  // Handle Update Inquiry Status
  const handleUpdateInquiryStatus = async (inquiryId: number, status: string) => {
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        showToast(`Enquiry marked as ${status}.`);
        loadData();
      }
    } catch (err) {
      console.error("Error updating enquiry status:", err);
    }
  };

  const totalValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
  const pendingVisits = enquiries.filter(i => i.status === "Pending").length;
  const confirmedVisits = enquiries.filter(i => i.status === "Confirmed").length;

  const money = (n: number) => n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : `₹${(n / 100000).toFixed(1)} L`;

  return (
    <div className="seller-dashboard-wrap">
      {/* Top Banner / Welcome */}
      <div className="seller-hero">
        <div className="seller-hero-info">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <span className="badge badge-navy">Seller Management Workspace</span>
            <span className="identity-verified-pill" style={{ background: "rgba(16, 185, 129, 0.18)", color: "#6ee7b7", borderColor: "rgba(110, 231, 183, 0.4)", marginLeft: 0 }}>
              <ShieldCheck size={11} /> Verified Seller
            </span>
          </div>
          <h2>Welcome, {user.name}</h2>
          <p>
            Manage your land plots, track buyer inquiries, and review scheduled site visit requests in real time.
          </p>
        </div>
        <div className="seller-hero-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={16} /> Add New Listing
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onViewMarketplace}
          >
            Marketplace Preview <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats seller-stats">
        <div>
          <span className="stat-icon"><Building2 /></span>
          <p>
            <strong>{properties.length}</strong>
            <small>Active Listings</small>
          </p>
        </div>
        <div>
          <span className="stat-icon"><Users /></span>
          <p>
            <strong>{enquiries.length}</strong>
            <small>Buyer Enquiries</small>
          </p>
        </div>
        <div>
          <span className="stat-icon"><CalendarDays /></span>
          <p>
            <strong>{pendingVisits}</strong>
            <small>Pending Site Visits</small>
          </p>
        </div>
        <div>
          <span className="stat-icon"><CircleDollarSign /></span>
          <p>
            <strong>{money(totalValue)}</strong>
            <small>Total Portfolio Value</small>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="seller-nav-tabs">
        <button
          className={`seller-tab-btn ${activeTab === "listings" ? "active" : ""}`}
          onClick={() => setActiveTab("listings")}
        >
          <Building2 size={16} /> Property Listings ({properties.length})
        </button>
        <button
          className={`seller-tab-btn ${activeTab === "enquiries" ? "active" : ""}`}
          onClick={() => setActiveTab("enquiries")}
        >
          <Users size={16} /> Buyer Enquiries & Site Visits ({enquiries.length})
          {pendingVisits > 0 && <span className="tab-pill-badge">{pendingVisits} new</span>}
        </button>
      </div>

      {loading ? (
        <div className="seller-loading">
          <span className="spinner" /> Loading your seller workspace…
        </div>
      ) : activeTab === "listings" ? (
        /* LISTING MANAGEMENT */
        <div className="seller-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Inventory Control</p>
              <h2>Your Listed Properties</h2>
              <p className="subtext">
                Live listings available on LandAI search with automated document verification and 3D preview.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} /> Add Listing
            </button>
          </div>

          {properties.length === 0 ? (
            <div className="empty">
              <Building2 size={40} />
              <h3>No properties listed yet</h3>
              <p>Click &quot;Add Listing&quot; to publish your first property plot on LandAI.</p>
            </div>
          ) : (
            <div className="seller-listing-grid">
              {properties.map(p => (
                <div key={p.id} className="seller-property-card">
                  <div className="seller-prop-img">
                    <img src={p.image} alt={p.title} />
                    <span className="badge badge-green">{p.score}% Match</span>
                    {p.verified && (
                      <span className="verified-badge">
                        <ShieldCheck size={13} /> Verified
                      </span>
                    )}
                  </div>
                  <div className="seller-prop-body">
                    <div className="seller-prop-meta">
                      <span className="prop-type-badge">{p.type}</span>
                      <span className="prop-location"><MapPin size={13} /> {p.location}</span>
                    </div>
                    <h3>{p.title}</h3>
                    <div className="seller-prop-numbers">
                      <div>
                        <span>Price</span>
                        <strong>{money(p.price)}</strong>
                      </div>
                      <div>
                        <span>Area</span>
                        <strong>{p.area.toLocaleString()} sq ft</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong className="status-active">Active</strong>
                      </div>
                    </div>
                    <div className="property-tags">
                      {p.tags.map(t => <span key={t}>{t}</span>)}
                    </div>
                    <div className="seller-prop-actions">
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => handleDeleteProperty(p.id)}
                        title="Delete listing"
                      >
                        <Trash2 size={15} /> Remove Listing
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* BUYER ENQUIRIES */
        <div className="seller-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Client Communications</p>
              <h2>Buyer Enquiries & Site Visits</h2>
              <p className="subtext">
                Incoming requests from verified buyers scheduling physical inspections or requesting documentation.
              </p>
            </div>
          </div>

          {enquiries.length === 0 ? (
            <div className="empty">
              <Users size={40} />
              <h3>No buyer inquiries yet</h3>
              <p>When buyers request site visits or send questions, they will appear here.</p>
            </div>
          ) : (
            <div className="enquiry-list">
              {enquiries.map(inq => (
                <div key={inq.id} className={`enquiry-card status-${inq.status.toLowerCase()}`}>
                  <div className="enquiry-top">
                    <div className="enquiry-buyer-info">
                      <span className="buyer-avatar">
                        {inq.buyer_name ? inq.buyer_name.slice(0, 2).toUpperCase() : "BY"}
                      </span>
                      <div>
                        <strong>{inq.buyer_name}</strong>
                        <small>{inq.buyer_email}</small>
                      </div>
                    </div>
                    <div className="enquiry-status-chip">
                      <span className={`status-pill pill-${inq.status.toLowerCase()}`}>
                        {inq.status === "Confirmed" && <CheckCircle2 size={13} />}
                        {inq.status === "Pending" && <Clock size={13} />}
                        {inq.status === "Declined" && <XCircle size={13} />}
                        {inq.status}
                      </span>
                    </div>
                  </div>

                  <div className="enquiry-details">
                    <div className="enquiry-prop">
                      <Building2 size={15} />
                      <span>Property: <strong>{inq.property_title}</strong></span>
                    </div>
                    {inq.visit_date && (
                      <div className="enquiry-time">
                        <CalendarDays size={15} />
                        <span>Requested Visit: <strong>{inq.visit_date} at {inq.visit_time || "10:30 AM"}</strong></span>
                      </div>
                    )}
                  </div>

                  {inq.message && (
                    <div className="enquiry-message-box">
                      <p>&ldquo;{inq.message}&rdquo;</p>
                    </div>
                  )}

                  <div className="enquiry-action-row">
                    {inq.status === "Pending" ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleUpdateInquiryStatus(inq.id, "Confirmed")}
                        >
                          <CheckCircle2 size={14} /> Confirm Visit
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleUpdateInquiryStatus(inq.id, "Declined")}
                        >
                          <XCircle size={14} /> Decline
                        </button>
                      </>
                    ) : inq.status === "Confirmed" ? (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleUpdateInquiryStatus(inq.id, "Completed")}
                      >
                        Mark Completed
                      </button>
                    ) : (
                      <span className="enquiry-settled-text">Status: {inq.status}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD PROPERTY MODAL */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="add-property-modal">
            <button
              className="modal-close"
              onClick={() => setShowAddModal(false)}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="modal-header-icon">
              <Plus size={22} />
            </div>

            <h3>List New Property Plot</h3>
            <p className="modal-desc">
              Publish your property details directly to the LandAI marketplace.
            </p>

            {addError && (
              <div className="auth-alert error-alert">
                <AlertCircle size={15} />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddProperty} className="add-prop-form">
              <div className="form-group">
                <label>Property Title</label>
                <input
                  required
                  placeholder="e.g. Palm Meadows Boulevard"
                  value={addTitle}
                  onChange={e => setAddTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  required
                  placeholder="e.g. Sarjapur Road, Bengaluru"
                  value={addLocation}
                  onChange={e => setAddLocation(e.target.value)}
                />
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label>Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    min={100000}
                    placeholder="e.g. 9500000"
                    value={addPrice}
                    onChange={e => setAddPrice(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Plot Area (sq ft)</label>
                  <input
                    type="number"
                    required
                    min={500}
                    placeholder="e.g. 2400"
                    value={addArea}
                    onChange={e => setAddArea(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-two">
                <div className="form-group">
                  <label>Property Type</label>
                  <select value={addType} onChange={e => setAddType(e.target.value)}>
                    <option value="Residential">Residential</option>
                    <option value="Plot">Plot</option>
                    <option value="Commercial">Commercial</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Highlights / Tags</label>
                  <input
                    placeholder="e.g. Gated, East-facing"
                    value={addTags}
                    onChange={e => setAddTags(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Photo URL (Optional)</label>
                <input
                  placeholder="https://images.unsplash.com/..."
                  value={addImage}
                  onChange={e => setAddImage(e.target.value)}
                />
              </div>

              <div className="modal-buttons-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addLoading}
                >
                  {addLoading ? "Publishing…" : "Publish Listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="toast">
          <CheckCircle2 size={15} /> {toastMsg}
        </div>
      )}
    </div>
  );
}
