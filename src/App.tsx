import { FormEvent, lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Bell, Bookmark, Bot, Building2, CalendarDays, Check, ChevronDown,
  ChevronRight, CircleDollarSign, Compass, FileCheck2, FileText, Heart, Home,
  Layers3, LayoutDashboard, LogOut, Map, MapPin, Menu, MessageSquare, Move3d,
  Plus, Rotate3d, Search, Send, ShieldCheck, SlidersHorizontal, Sparkles,
  UploadCloud, UserRound, Users, X, Zap, CheckCircle2
} from "lucide-react";

import AuthPage from "./components/AuthPage";
import SellerDashboard from "./components/SellerDashboard";
import { User } from "./types/auth";

const BuildingStudio = lazy(() => import("./BuildingStudio"));

export type Page =
  | "overview"
  | "discover"
  | "documents"
  | "estimator"
  | "studio"
  | "visits"
  | "seller_dashboard";

export type Property = {
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
};

const initialPhotos = [
  "https://images.unsplash.com/photo-1505843795480-5cfb3c03f6ff?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1631728884184-98ba78f39d1c?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1676828390434-6ae9782fd194?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1523192159590-edbd468b9518?auto=format&fit=crop&w=1200&q=85",
];

const fallbackProperties: Property[] = [
  { id: 1, title: "Palm Grove Residences", location: "Whitefield, Bengaluru", price: 12500000, area: 2400, type: "Residential", score: 96, image: initialPhotos[0], verified: true, tags: ["East-facing", "40 ft road"] },
  { id: 2, title: "Verdant Acres", location: "Sarjapur Road, Bengaluru", price: 8950000, area: 1800, type: "Plot", score: 92, image: initialPhotos[1], verified: true, tags: ["Gated", "Park view"] },
  { id: 3, title: "Lakeview Enclave", location: "Yelahanka, Bengaluru", price: 10200000, area: 2100, type: "Residential", score: 89, image: initialPhotos[2], verified: true, tags: ["Lake nearby", "Corner plot"] },
  { id: 4, title: "Orchard County", location: "Devanahalli, Bengaluru", price: 6800000, area: 1500, type: "Plot", score: 86, image: initialPhotos[3], verified: false, tags: ["Airport 15 min", "30 ft road"] },
];

const money = (n: number) => n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : `₹${(n / 100000).toFixed(1)} L`;

function Button({ children, kind = "primary", onClick, type = "button", className = "", disabled = false }: {
  children: React.ReactNode; kind?: "primary" | "secondary" | "ghost"; onClick?: () => void;
  type?: "button" | "submit"; className?: string; disabled?: boolean;
}) {
  return <button type={type} onClick={onClick} disabled={disabled} className={`btn btn-${kind} ${className}`}>{children}</button>;
}

function Badge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "amber" | "navy" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function PropertyCard({ property, saved, onSave, onOpen }: { property: Property; saved: boolean; onSave: () => void; onOpen: () => void }) {
  return (
    <article className="property-card">
      <div className="property-image">
        <img src={property.image} alt={property.title} />
        <Badge>{property.score}% match</Badge>
        <button className={`save-button ${saved ? "saved" : ""}`} onClick={onSave} aria-label="Save property"><Heart size={18} fill={saved ? "currentColor" : "none"} /></button>
      </div>
      <div className="property-content">
        <div className="property-meta">
          <Badge tone={property.verified ? "green" : "amber"}>{property.verified ? <><ShieldCheck size={13} /> AI verified</> : "Verification pending"}</Badge>
          <span>{property.type}</span>
        </div>
        <h3>{property.title}</h3>
        <p className="location"><MapPin size={15} /> {property.location}</p>
        <div className="property-tags">{property.tags.map(t => <span key={t}>{t}</span>)}</div>
        <div className="property-bottom">
          <div><strong>{money(property.price)}</strong><span>{property.area.toLocaleString()} sq ft</span></div>
          <button onClick={onOpen} aria-label="View details"><ArrowRight size={18} /></button>
        </div>
      </div>
    </article>
  );
}

function Header({
  title,
  user,
  onMenu,
  onLogout
}: {
  title: string;
  user: User;
  onMenu: () => void;
  onLogout: () => void;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const initials = user.name
    .split(" ")
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "LA";

  return (
    <header className="topbar">
      <button className="mobile-menu" onClick={onMenu} aria-label="Open menu"><Menu size={22} /></button>
      <div><p className="eyebrow">AI-Powered Property Recommendation System</p><h1>{title}</h1></div>
      <div className="header-actions">
        <button className="icon-button" aria-label="Notifications"><Bell size={19} /><i /></button>
        <div style={{ position: "relative" }}>
          <button
            className="profile"
            onClick={() => setShowDropdown(!showDropdown)}
            title="Account profile"
          >
            <span>{initials}</span>
            <div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <strong>{user.name}</strong>
                <span className="identity-verified-pill" title="Email verified and active">
                  <ShieldCheck size={10} /> Verified
                </span>
              </div>
              <small>{user.role === "buyer" ? "Buyer account" : "Seller account"}</small>
            </div>
            <ChevronDown size={15} />
          </button>

          {showDropdown && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 8px)",
                background: "white",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                padding: "8px",
                minWidth: "190px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                zIndex: 50
              }}
            >
              <div style={{ padding: "8px 10px", borderBottom: "1px solid #edf2f0" }}>
                <strong style={{ display: "block", fontSize: "12px", color: "var(--navy)" }}>{user.name}</strong>
                <small style={{ color: "var(--muted)", fontSize: "10px" }}>{user.email}</small>
                <div style={{ marginTop: 5 }}>
                  <span className="identity-verified-pill" style={{ marginLeft: 0 }}>
                    <ShieldCheck size={10} /> Verified Email
                  </span>
                </div>
              </div>
              <button
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  border: 0,
                  background: "transparent",
                  padding: "9px 10px",
                  color: "#dc2626",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderRadius: "8px",
                  cursor: "pointer",
                  textAlign: "left",
                  marginTop: "4px"
                }}
                onClick={() => {
                  setShowDropdown(false);
                  onLogout();
                }}
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Overview({
  setPage,
  saved,
  onSave,
  onOpen,
  properties
}: {
  setPage: (p: Page) => void;
  saved: number[];
  onSave: (id: number) => void;
  onOpen: (p: Property) => void;
  properties: Property[];
}) {
  return (
    <div className="page-stack">
      <section className="hero">
        <div className="hero-copy">
          <Badge tone="navy"><Sparkles size={13} /> Smarter property decisions</Badge>
          <h2>Find the right land.<br /><em>Build with confidence.</em></h2>
          <p>AI-curated properties, legal clarity and construction intelligence—all in one trusted workspace.</p>
          <div className="hero-actions">
            <Button onClick={() => setPage("discover")}>Explore properties <ArrowRight size={17} /></Button>
            <Button kind="secondary" onClick={() => setPage("documents")}><FileCheck2 size={17} /> Verify documents</Button>
          </div>
        </div>
        <div className="hero-visual">
          <img src={properties[0]?.image || initialPhotos[0]} alt="Modern home surrounded by landscaped greenery" />
          <div className="floating-match"><span><Zap size={15} /> AI top match</span><strong>96%</strong><small>Based on 14 preferences</small></div>
          <div className="trust-chip"><ShieldCheck size={18} /><span><strong>Legally verified</strong><small>18 documents checked</small></span></div>
        </div>
      </section>

      <section className="search-panel">
        <label><span>Where do you want to buy?</span><div><MapPin size={18} /><input defaultValue="Bengaluru" /></div></label>
        <label><span>Budget</span><div><CircleDollarSign size={18} /><select defaultValue="50L–1.5Cr"><option>50L–1.5Cr</option><option>Under 50L</option><option>1.5Cr+</option></select></div></label>
        <label><span>Land area</span><div><Layers3 size={18} /><select defaultValue="1,500–3,000 sq ft"><option>1,500–3,000 sq ft</option><option>Under 1,500 sq ft</option><option>3,000+ sq ft</option></select></div></label>
        <Button onClick={() => setPage("discover")}><Search size={18} /> Search</Button>
      </section>

      <div className="stats">
        <div><span className="stat-icon"><Building2 /></span><p><strong>2,480+</strong><small>Verified properties</small></p></div>
        <div><span className="stat-icon"><Users /></span><p><strong>12,000+</strong><small>Happy buyers</small></p></div>
        <div><span className="stat-icon"><FileCheck2 /></span><p><strong>98.6%</strong><small>Document accuracy</small></p></div>
        <div><span className="stat-icon"><Zap /></span><p><strong>3.2 sec</strong><small>AI match time</small></p></div>
      </div>

      <section>
        <div className="section-head">
          <div><p className="eyebrow">Curated for your preferences</p><h2>Your top AI matches</h2></div>
          <Button kind="ghost" onClick={() => setPage("discover")}>View all <ArrowRight size={16} /></Button>
        </div>
        <div className="property-grid">
          {properties.slice(0, 3).map(p => (
            <PropertyCard
              key={p.id}
              property={p}
              saved={saved.includes(p.id)}
              onSave={() => onSave(p.id)}
              onOpen={() => onOpen(p)}
            />
          ))}
        </div>
      </section>

      <section className="intelligence">
        <div><p className="eyebrow light">One connected workflow</p><h2>From search to groundbreaking,<br />make every choice with clarity.</h2><p>LandAI brings fragmented property decisions into one calm, intelligent workspace.</p></div>
        <div className="feature-list">
          <button onClick={() => setPage("documents")}><span><FileCheck2 /></span><div><strong>Legal document intelligence</strong><small>Extract, compare and flag issues automatically</small></div><ChevronRight /></button>
          <button onClick={() => setPage("estimator")}><span><CircleDollarSign /></span><div><strong>Construction cost planning</strong><small>Live estimates tailored to your plot and finish</small></div><ChevronRight /></button>
          <button onClick={() => setPage("studio")}><span><Move3d /></span><div><strong>Interactive 3D visualization</strong><small>Explore massing, floors and orientation</small></div><ChevronRight /></button>
        </div>
      </section>
    </div>
  );
}

function Discover({
  saved,
  onSave,
  onOpen,
  properties
}: {
  saved: number[];
  onSave: (id: number) => void;
  onOpen: (p: Property) => void;
  properties: Property[];
}) {
  const [query, setQuery] = useState("");
  const [verified, setVerified] = useState(false);
  const results = properties.filter(p => `${p.title} ${p.location}`.toLowerCase().includes(query.toLowerCase()) && (!verified || p.verified));
  return (
    <div className="page-stack">
      <div className="section-head"><div><p className="eyebrow">Personalized discovery</p><h2>Properties matched to you</h2><p className="subtext">{results.length} properties based on your budget, location and lifestyle.</p></div><Button kind="secondary"><Bookmark size={16} /> Saved ({saved.length})</Button></div>
      <div className="filterbar">
        <div className="search-input"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search location or property" /></div>
        <select><option>Any price</option><option>Under ₹1 Cr</option><option>₹1–2 Cr</option></select>
        <select><option>All property types</option><option>Residential</option><option>Plot</option></select>
        <button className={`filter-toggle ${verified ? "active" : ""}`} onClick={() => setVerified(!verified)}><ShieldCheck size={17} /> Verified only</button>
        <Button kind="secondary"><SlidersHorizontal size={17} /> Filters</Button>
      </div>
      {results.length ? (
        <div className="property-grid wide">
          {results.map(p => (
            <PropertyCard key={p.id} property={p} saved={saved.includes(p.id)} onSave={() => onSave(p.id)} onOpen={() => onOpen(p)} />
          ))}
        </div>
      ) : (
        <div className="empty"><Search /><h3>No matching properties</h3><p>Try changing your search or verification filter.</p></div>
      )}
    </div>
  );
}

type OcrPage = {
  page_number: number;
  text: string;
  detected_language: string;
  confidence: number | null;
  status: string;
  warnings: string[];
};

type OcrDocument = {
  document_id: string;
  original_name: string;
  status: string;
  page_count: number;
  model_version?: string;
  engine?: string;
  pages: OcrPage[];
};

function Documents() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [document, setDocument] = useState<OcrDocument | null>(null);
  const [language, setLanguage] = useState("ta-en");
  const ocrApi = import.meta.env.VITE_OCR_API_URL || "http://127.0.0.1:8000";

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setDocument(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("language", language);
      const upload = await fetch(`${ocrApi}/api/ocr/upload`, { method: "POST", body: form });
      if (!upload.ok) throw new Error((await upload.json().catch(() => null))?.detail || "OCR upload failed");
      const uploaded = await upload.json();
      const process = await fetch(`${ocrApi}/api/ocr/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: uploaded.document_id })
      });
      if (!process.ok) throw new Error((await process.json().catch(() => null))?.detail || "OCR processing failed");
      const processed = await process.json();
      setDocument({
        ...processed,
        document_id: uploaded.document_id,
        engine: processed.processing?.engine,
        model_version: processed.processing?.model_version
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to the OCR service");
    } finally {
      setLoading(false);
    }
  };

  const updatePageText = (pageNumber: number, text: string) => {
    setDocument(current => current ? {
      ...current,
      pages: current.pages.map(page => page.page_number === pageNumber ? { ...page, text } : page)
    } : current);
  };

  const saveCorrections = async () => {
    if (!document) return;
    const response = await fetch(`${ocrApi}/api/ocr/document/${document.document_id}/corrections`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pages: Object.fromEntries(document.pages.map(page => [page.page_number, page.text])) })
    });
    if (!response.ok) {
      setError("Corrections could not be saved.");
      return;
    }
    setError("");
  };

  return (
    <div className="tool-layout">
      <section><p className="eyebrow">AI document verification</p><h2>Turn property paperwork into clear answers.</h2><p className="subtext">Upload a title deed, encumbrance certificate or survey record. LandAI extracts fields, cross-checks consistency and creates a plain-language report.</p>
        <label className={`upload-zone ${file ? "has-file" : ""}`}>
          <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => { setFile(e.target.files?.[0] || null); setDocument(null); setError(""); }} />
          {file ? <><FileText size={34} /><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB • Ready for OCR</span></> : <><UploadCloud size={38} /><strong>Drop your document here</strong><span>PDF, JPG or PNG • up to 50 MB</span><small>Browse files</small></>}
        </label>
        <label className="ocr-language-select"><span>OCR language</span><select value={language} onChange={e => setLanguage(e.target.value)} disabled={loading}><option value="ta-en">Tamil + English</option><option value="ta">Tamil</option><option value="en">English</option><option value="auto">Automatic</option></select></label>
        <Button onClick={analyze} className="full" kind={file ? "primary" : "secondary"} disabled={!file || loading}>{loading ? <><span className="spinner" /> Running Tesseract OCR…</> : <><Sparkles size={17} /> Run OCR model</>}</Button>
        {error && <p className="ocr-error">{error}</p>}
      </section>
      <aside className="report-card">
        <div className="report-head"><div><p className="eyebrow">OCR output</p><h3>{document ? document.original_name : "Your OCR result will appear here"}</h3></div>{document && <Badge>{document.engine || "Tesseract"}</Badge>}</div>
        {!document ? <div className="report-empty"><FileCheck2 /><p>Upload a document to run the real Tamil-English OCR model. Extracted text will appear here for review.</p></div> :
          <div className="report-results">
            <div className="ocr-model-meta"><span>{document.page_count} page(s)</span><span>{document.model_version || "Tesseract model"}</span></div>
            {document.pages.map(page => <div className="ocr-page-result" key={page.page_number}><div className="field-row"><span>Page {page.page_number} • {page.detected_language}</span><strong>{page.confidence == null ? "—" : `${page.confidence.toFixed(1)}% confidence`}</strong></div><textarea value={page.text} onChange={e => updatePageText(page.page_number, e.target.value)} aria-label={`OCR text for page ${page.page_number}`} /></div>)}
            <Button kind="secondary" className="full" onClick={saveCorrections}><Check size={16} /> Save corrections</Button>
            <a className="ocr-download" href={`${ocrApi}/api/ocr/document/${document.document_id}/export/txt`} target="_blank" rel="noreferrer"><FileText size={16} /> Download extracted text</a>
          </div>}
      </aside>
    </div>
  );
}

function Estimator() {
  const savedBuilding = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("landai-building") || "{}"); } catch { return {}; }
  }, []);
  const [area, setArea] = useState(() => savedBuilding.width && savedBuilding.depth ? savedBuilding.width * savedBuilding.depth * (savedBuilding.floors || 1) : 2200);
  const [floors, setFloors] = useState(() => savedBuilding.floors || 2);
  const [quality, setQuality] = useState("Premium");
  const rate = quality === "Essential" ? 1900 : quality === "Premium" ? 2700 : 3400;
  const total = area * rate * (1 + (floors - 1) * 0.06);
  return (
    <div className="tool-layout">
      <section><p className="eyebrow">Construction intelligence</p><h2>Plan the build before you buy.</h2><p className="subtext">Get a transparent preliminary estimate using current Bengaluru material and labour benchmarks.</p>
        <div className="form-card">
          <label><span>Built-up area <strong>{area.toLocaleString()} sq ft</strong></span><input type="range" min="800" max="6000" step="100" value={area} onChange={e => setArea(+e.target.value)} /><small><i>800</i><i>6,000 sq ft</i></small></label>
          <label><span>Number of floors</span><div className="segmented">{[1,2,3,4,5].map(n => <button className={floors === n ? "active" : ""} onClick={() => setFloors(n)} key={n}>{n}</button>)}</div></label>
          <label><span>Finish quality</span><div className="quality-grid">{["Essential","Premium","Luxury"].map((q,i) => <button className={quality === q ? "active" : ""} onClick={() => setQuality(q)} key={q}><span>{["₹₹","₹₹₹","₹₹₹₹"][i]}</span><strong>{q}</strong><small>₹{[1900,2700,3400][i].toLocaleString()}/sq ft</small></button>)}</div></label>
          <div className="form-row"><label><span>Plot area</span><div className="unit-input"><input defaultValue="2400" /><small>sq ft</small></div></label><label><span>City</span><select defaultValue="Bengaluru"><option>Bengaluru</option><option>Hyderabad</option><option>Chennai</option></select></label></div>
        </div>
      </section>
      <aside className="estimate-card">
        <p className="eyebrow light">Live estimate</p><span>Estimated construction cost</span><h3>{money(total)}</h3><small>± 8% based on final specifications</small>
        <div className="cost-chart">{[["Structure",42],["Finishes",26],["Services",18],["Professional",8],["Contingency",6]].map(([n,v]) => <div key={n as string}><span>{n}<i>{v}%</i></span><b><i style={{width:`${v}%`}} /></b></div>)}</div>
        <div className="budget-row"><span>Cost per sq ft</span><strong>₹{rate.toLocaleString()}</strong></div><div className="budget-row"><span>Build duration</span><strong>{8 + floors * 2}–{10 + floors * 2} months</strong></div>
        <Button className="full">Save estimate <ArrowRight size={16} /></Button>
      </aside>
    </div>
  );
}

function Studio() { return <Suspense fallback={<div className="studio-route-loading"><span className="spinner" /> Loading 3D studio…</div>}><BuildingStudio /></Suspense>; }

function Visits({
  onBookVisit,
  properties
}: {
  onBookVisit: (propertyId: number, date: string, time: string) => Promise<boolean>;
  properties: Property[];
}) {
  const [selectedPropId, setSelectedPropId] = useState(2);
  const [selectedDate, setSelectedDate] = useState("Wed 20");
  const [selectedTime, setSelectedTime] = useState("10:30 AM");
  const [booked, setBooked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedProp = properties.find(p => p.id === selectedPropId) || properties[0] || fallbackProperties[1];

  const handleRequestVisit = async () => {
    setSubmitting(true);
    const success = await onBookVisit(selectedProp.id, selectedDate, selectedTime);
    setSubmitting(false);
    if (success) {
      setBooked(true);
    }
  };

  return (
    <div className="map-layout">
      <div className="map-panel">
        <div className="map-bg" />
        {[[28,35,1],[58,54,2],[72,27,3],[42,70,4]].map(([x,y,n]) => (
          <button
            className={`map-pin ${selectedPropId === n ? "active-pin" : ""}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            key={n}
            onClick={() => { setSelectedPropId(n); setBooked(false); }}
          >
            <MapPin /><span>{n}</span>
          </button>
        ))}
        <div className="map-search"><Search /><input placeholder="Search a neighbourhood" /></div>
        <div className="map-legend"><span><i /> Verified properties</span><strong>OpenStreetMap</strong></div>
      </div>
      <aside className="visit-panel">
        <p className="eyebrow">Site visits</p>
        <h2>Explore in person</h2>
        <p className="subtext">Plan routes and manage appointments with sellers.</p>
        <div className="visit-card">
          <img src={selectedProp.image} alt={selectedProp.title} />
          <div>
            <Badge>{selectedProp.score}% match</Badge>
            <h3>{selectedProp.title}</h3>
            <p><MapPin /> {selectedProp.location}</p>
          </div>
        </div>
        <div className="calendar-strip">
          {["Mon 18","Tue 19","Wed 20","Thu 21"].map((d) => (
            <button
              className={selectedDate === d ? "active" : ""}
              key={d}
              onClick={() => { setSelectedDate(d); setBooked(false); }}
            >
              <span>{d.split(" ")[0]}</span>
              <strong>{d.split(" ")[1]}</strong>
            </button>
          ))}
        </div>
        <label>
          <span>Preferred time</span>
          <select value={selectedTime} onChange={e => { setSelectedTime(e.target.value); setBooked(false); }}>
            <option>10:30 AM</option>
            <option>12:00 PM</option>
            <option>02:00 PM</option>
            <option>03:30 PM</option>
          </select>
        </label>
        <Button className="full" onClick={handleRequestVisit} disabled={submitting}>
          {submitting ? (
            <><span className="spinner" /> Submitting request…</>
          ) : booked ? (
            <><Check /> Visit confirmed with seller</>
          ) : (
            <><CalendarDays /> Request site visit</>
          )}
        </Button>
        {booked && (
          <div className="success-note">
            <Check />
            <p>
              <strong>Visit request logged in database</strong>
              <span>The property seller will confirm within 2 hours.</span>
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

function DetailModal({
  property,
  onClose,
  onVisit
}: {
  property: Property;
  onClose: () => void;
  onVisit: () => void;
}) {
  return (
    <div className="modal-backdrop">
      <div className="detail-modal">
        <button className="modal-close" onClick={onClose}><X /></button>
        <img src={property.image} alt={property.title} />
        <div className="detail-copy">
          <Badge>{property.score}% AI match</Badge>
          <h2>{property.title}</h2>
          <p className="location"><MapPin /> {property.location}</p>
          <div className="detail-numbers">
            <div><span>Price</span><strong>{money(property.price)}</strong></div>
            <div><span>Plot area</span><strong>{property.area.toLocaleString()} sq ft</strong></div>
            <div><span>Status</span><strong>{property.verified ? "Verified" : "Pending"}</strong></div>
          </div>
          <div className="match-reasons">
            <h3>Why this matches you</h3>
            <p><Check /> Within your ₹1.5 Cr budget</p>
            <p><Check /> Preferred east-facing orientation</p>
            <p><Check /> 12 minutes from your selected school zone</p>
          </div>
          <Button className="full" onClick={onVisit}><CalendarDays /> Schedule a site visit</Button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App Navigation & Data State
  const [page, setPage] = useState<Page>("overview");
  const [properties, setProperties] = useState<Property[]>(fallbackProperties);
  const [saved, setSaved] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("landai-saved") || "[]"); } catch { return []; }
  });
  const [menu, setMenu] = useState(false);
  const [detail, setDetail] = useState<Property | null>(null);
  const [chat, setChat] = useState(false);
  const [toast, setToast] = useState("");

  // Check Session on Boot
  useEffect(() => {
    const verifySession = async () => {
      try {
        const token = localStorage.getItem("landai_token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/auth/me", {
          credentials: "include",
          headers
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            // Default page according to role
            if (data.user.role === "seller") {
              setPage("seller_dashboard");
            }
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Session verification failed:", err);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    verifySession();
  }, []);

  // Sync Saved properties
  useEffect(() => {
    localStorage.setItem("landai-saved", JSON.stringify(saved));
  }, [saved]);

  // Load properties from backend
  const loadLiveProperties = async () => {
    try {
      const res = await fetch("/api/properties", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.properties) && data.properties.length > 0) {
          setProperties(data.properties);
        }
      }
    } catch (e) {
      console.warn("Could not fetch live properties, using fallback list:", e);
    }
  };

  useEffect(() => {
    if (user) {
      loadLiveProperties();
    }
  }, [user]);

  // Role-based Navigation Items
  const navItems = useMemo(() => {
    if (user?.role === "seller") {
      return [
        { id: "seller_dashboard" as Page, label: "Seller Workspace", icon: LayoutDashboard },
        { id: "discover" as Page, label: "Marketplace Preview", icon: Search },
        { id: "estimator" as Page, label: "Cost Estimator", icon: CircleDollarSign },
        { id: "studio" as Page, label: "3D Studio", icon: Move3d },
      ];
    }
    return [
      { id: "overview" as Page, label: "Overview", icon: LayoutDashboard },
      { id: "discover" as Page, label: "Discover", icon: Search },
      { id: "documents" as Page, label: "Document AI", icon: FileCheck2 },
      { id: "estimator" as Page, label: "Cost estimator", icon: CircleDollarSign },
      { id: "studio" as Page, label: "3D studio", icon: Move3d },
      { id: "visits" as Page, label: "Maps & visits", icon: Map },
    ];
  }, [user?.role]);

  const title = useMemo(() => {
    if (page === "seller_dashboard") return "Seller Dashboard";
    return navItems.find(n => n.id === page)?.label || "Overview";
  }, [page, navItems]);

  const save = (id: number) => {
    setSaved(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
    setToast(saved.includes(id) ? "Removed from saved properties" : "Property saved to your shortlist");
    setTimeout(() => setToast(""), 2200);
  };

  const go = (p: Page) => {
    setPage(p);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Real Logout Handler
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    localStorage.removeItem("landai_token");
    setUser(null);
    setMenu(false);
    setPage("overview");
    setToast("Logged out successfully.");
    setTimeout(() => setToast(""), 2200);
  };

  // Real Book Site Visit Inquiry Handler
  const handleBookVisit = async (propertyId: number, date: string, time: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          property_id: propertyId,
          visit_date: date,
          visit_time: time,
          message: `Site visit scheduled for ${date} at ${time}.`
        })
      });
      if (res.ok) {
        setToast("Site visit request submitted to seller!");
        setTimeout(() => setToast(""), 2800);
        return true;
      }
      return false;
    } catch (e) {
      console.error("Failed to submit inquiry:", e);
      return false;
    }
  };

  // 1. Initial Session Loading Screen
  if (authLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-brand">
          <span className="auth-logo-icon"><Building2 size={26} /></span>
          <strong>LandAI</strong>
        </div>
        <span className="spinner" style={{ width: "24px", height: "24px", borderWidth: "3px" }} />
        <p>Connecting to secure LandAI workspace…</p>
      </div>
    );
  }

  // 2. Unauthenticated: SHOW LOGIN / REGISTRATION PAGE FIRST
  if (!user) {
    return (
      <AuthPage
        onLoginSuccess={(authenticatedUser) => {
          setUser(authenticatedUser);
          if (authenticatedUser.role === "seller") {
            setPage("seller_dashboard");
          } else {
            setPage("overview");
          }
        }}
      />
    );
  }

  // 3. Authenticated: Render Protected LandAI Experience
  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="brand">
          <span><Building2 /></span>
          <div>
            <strong>LandAI</strong>
            <small>
              {user.role === "seller" ? "Seller Intelligence" : "Property Intelligence"}
            </small>
          </div>
          <button onClick={() => setMenu(false)}><X /></button>
        </div>

        <nav>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              className={page === id ? "active" : ""}
              onClick={() => go(id)}
              key={id}
            >
              <Icon />
              <span>{label}</span>
              {id === "documents" && <i>AI</i>}
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <Sparkles />
          <strong>AI Assistant</strong>
          <p>
            {user.role === "seller"
              ? "Get guidance on pricing benchmarks, buyer conversion, and plot approvals."
              : "Ask about properties, legal checks, or your construction budget."}
          </p>
          <button onClick={() => setChat(true)}>Start a conversation <ArrowRight /></button>
        </div>

        <div className="side-footer">
          <button onClick={() => setToast(`Logged in as ${user.email} (${user.role})`)}>
            <UserRound />
            <span>{user.name}</span>
          </button>
          <button onClick={handleLogout}>
            <LogOut />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {menu && <button className="menu-scrim" onClick={() => setMenu(false)} />}

      {/* Main Protected Content */}
      <main>
        <Header
          title={title}
          user={user}
          onMenu={() => setMenu(true)}
          onLogout={handleLogout}
        />

        <div className="page-wrap">
          {/* Seller Dashboard view */}
          {user.role === "seller" && page === "seller_dashboard" && (
            <SellerDashboard
              user={user}
              onViewMarketplace={() => go("discover")}
            />
          )}

          {/* Buyer / Shared Views */}
          {page === "overview" && (
            <Overview
              setPage={go}
              saved={saved}
              onSave={save}
              onOpen={setDetail}
              properties={properties}
            />
          )}

          {page === "discover" && (
            <Discover
              saved={saved}
              onSave={save}
              onOpen={setDetail}
              properties={properties}
            />
          )}

          {page === "documents" && <Documents />}
          {page === "estimator" && <Estimator />}
          {page === "studio" && <Studio />}
          {page === "visits" && (
            <Visits
              onBookVisit={handleBookVisit}
              properties={properties}
            />
          )}
        </div>

        <footer>
          <span><Building2 /> LandAI</span>
          <p>Connecting verified buyers and legitimate sellers with trust, intelligence, and clarity.</p>
          <small>Authenticated session • Active user: {user.email}</small>
        </footer>
      </main>

      {/* Floating Chat Assistant */}
      <button className="chat-fab" onClick={() => setChat(!chat)} aria-label="AI property assistant">
        {chat ? <X /> : <MessageSquare />}
      </button>

      {chat && (
        <div className="chat-panel">
          <div className="chat-head">
            <span><Bot /></span>
            <div>
              <strong>LandAI Assistant</strong>
              <small><i /> Online • Verified Assistant</small>
            </div>
            <button onClick={() => setChat(false)}><X /></button>
          </div>
          <div className="chat-body">
            <div className="bot-message">
              Hi {user.name.split(" ")[0]}. I can compare properties, explain verification reports, or help you plan a construction budget.
            </div>
            <div className="quick-prompts">
              <button>Compare my top matches</button>
              <button>What can I build under ₹70L?</button>
              <button>Explain document risks</button>
            </div>
          </div>
          <div className="chat-input">
            <input placeholder="Ask about a property…" />
            <button><Send /></button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <DetailModal
          property={detail}
          onClose={() => setDetail(null)}
          onVisit={() => {
            setDetail(null);
            go("visits");
          }}
        />
      )}

      {/* Global Toast */}
      {toast && (
        <div className="toast">
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}
    </div>
  );
}
