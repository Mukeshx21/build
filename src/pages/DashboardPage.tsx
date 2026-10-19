import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  FileText,
  History,
  Search,
  ShieldAlert,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { api, formatErrorMessage } from "../services/api"
import { Alert, Button, Skeleton } from "../components/ui"

export default function DashboardPage() {
  const { user, requiresEmailVerification } = useAuth()
  const [historyCount, setHistoryCount] = useState<number | null>(null)
  const [docCount, setDocCount] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (requiresEmailVerification) return
    let cancelled = false
    ;(async () => {
      try {
        const [docs, hist] = await Promise.all([
          api.documents.list(),
          api.documents.history(),
        ])
        if (!cancelled) {
          setDocCount(docs.documents.length)
          setHistoryCount(hist.history.length)
        }
      } catch (err) {
        if (!cancelled) setError(formatErrorMessage(err))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [requiresEmailVerification])

  return (
    <div className="page-stack">
      <section className="dash-hero">
        <div>
          <p className="eyebrow">Welcome</p>
          <h2>
            {user?.name}, your land-record workspace is ready.
          </h2>
          <p className="subtext">
            Digitize documents, review OCR carefully, validate format checks, and
            explore properties with transparent recommendation reasons.
          </p>
          <div className="hero-actions">
            <Link to="/app/documents">
              <Button>
                Open OCR workspace <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/app/discover">
              <Button kind="secondary">
                <Search size={16} /> Browse properties
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {requiresEmailVerification ? (
        <Alert tone="warning">
          <ShieldAlert size={16} style={{ display: "inline", marginRight: 6 }} />
          Verify your email to unlock document upload, validation, and property
          APIs. <Link to="/verify-email">Continue verification</Link>
        </Alert>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="stats">
        <div>
          <span className="stat-icon">
            <FileText />
          </span>
          <p>
            <strong>
              {docCount == null ? <Skeleton className="skel-inline" /> : docCount}
            </strong>
            <small>Your documents</small>
          </p>
        </div>
        <div>
          <span className="stat-icon">
            <History />
          </span>
          <p>
            <strong>
              {historyCount == null ? (
                <Skeleton className="skel-inline" />
              ) : (
                historyCount
              )}
            </strong>
            <small>Processing events</small>
          </p>
        </div>
        <div>
          <span className="stat-icon">
            <Search />
          </span>
          <p>
            <strong>{user?.role === "seller" ? "Seller" : "Buyer"}</strong>
            <small>Active role</small>
          </p>
        </div>
      </div>

      <section className="callout-panel">
        <h3>Important</h3>
        <p>
          Successful OCR or automated validation does not prove legal ownership,
          clear title, or fraud-free status. Official government verification is
          only claimed when an authorized data source is configured and executed.
        </p>
      </section>
    </div>
  )
}
