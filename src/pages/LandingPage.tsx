import { Link } from "react-router-dom"
import {
  ArrowRight,
  CheckCircle2,
  FileSearch,
  MapPinned,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { Button } from "../components/ui"

const steps = [
  {
    title: "Upload land records",
    text: "PDF scans or photos of patta, EC, and survey documents in Tamil or English.",
  },
  {
    title: "Review OCR extraction",
    text: "Correct uncertain fields. LandAI never invents missing owner or survey data.",
  },
  {
    title: "Validate & discover",
    text: "Run format checks, then search properties with clear recommendation reasons.",
  },
]

export default function LandingPage() {
  return (
    <div className="public-shell">
      <header className="public-nav">
        <Link to="/" className="brand-inline">
          <span>
            <ShieldCheck size={18} />
          </span>
          <strong>LandAI</strong>
        </Link>
        <nav>
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <Link to="/login">Sign in</Link>
          <Link to="/register" className="nav-cta">
            Create account
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="eyebrow">Land record digitization</p>
          <h1>
            LandAI
            <span>Clarity for every acre.</span>
          </h1>
          <p className="lead">
            Digitize Tamil and English land documents with real OCR, review
            extracted fields, run transparent validation, and discover properties
            with explanations—not opaque scores.
          </p>
          <div className="hero-actions">
            <Link to="/register">
              <Button>
                Get started <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/login">
              <Button kind="secondary">Sign in</Button>
            </Link>
          </div>
        </div>
        <div className="landing-hero-visual" aria-hidden>
          <div className="hero-panel">
            <Sparkles size={18} />
            <strong>OCR workspace</strong>
            <p>Survey · Patta · Village · Owner fields marked for review</p>
            <ul>
              <li>
                <CheckCircle2 size={14} /> Tamil Unicode preserved
              </li>
              <li>
                <CheckCircle2 size={14} /> Confidence shown when available
              </li>
              <li>
                <CheckCircle2 size={14} /> No invented land details
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="features" className="landing-section">
        <p className="eyebrow">Features</p>
        <h2>Built for serious land-record work</h2>
        <div className="feature-grid">
          <article>
            <FileSearch />
            <h3>Bilingual OCR</h3>
            <p>
              Tesseract-backed Tamil + English extraction for PDF, JPG, and PNG
              land documents.
            </p>
          </article>
          <article>
            <ShieldCheck />
            <h3>Honest validation</h3>
            <p>
              Format and consistency checks with a clear disclaimer when official
              government verification is not configured.
            </p>
          </article>
          <article>
            <MapPinned />
            <h3>Property discovery</h3>
            <p>
              Search, save, and review recommendation reasons based on your stated
              preferences—never on sensitive personal traits.
            </p>
          </article>
        </div>
      </section>

      <section id="workflow" className="landing-section">
        <p className="eyebrow">Workflow</p>
        <h2>From scan to decision</h2>
        <ol className="workflow-list">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span>{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="public-footer">
        <strong>LandAI</strong>
        <p>
          Automated OCR and validation do not prove legal ownership or
          fraud-free title.
        </p>
      </footer>
    </div>
  )
}
