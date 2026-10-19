import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  Check,
  Download,
  FileCheck2,
  FileText,
  Sparkles,
  UploadCloud,
} from "lucide-react"
import {
  api,
  formatErrorMessage,
  type OcrDocument,
  type ValidationResult,
} from "../services/api"
import { Alert, Badge, Button } from "../components/ui"

const FIELD_LABELS: Record<string, string> = {
  survey_number: "Survey / subdivision",
  patta_number: "Patta number",
  registration_number: "Registration number",
  registration_date: "Registration date",
  land_area: "Land extent",
  village: "Village",
  taluk: "Taluk",
  district: "District",
  state: "State",
  owner_name: "Owner name",
  boundaries: "Boundaries",
}

export default function DocumentsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState("ta-en")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [document, setDocument] = useState<OcrDocument | null>(null)
  const [editedFields, setEditedFields] = useState<Record<string, string>>({})
  const [validation, setValidation] = useState<ValidationResult | null>(null)

  const fieldEntries = useMemo(() => {
    const source = document?.fields || {}
    return Object.keys(FIELD_LABELS).map((key) => ({
      key,
      label: FIELD_LABELS[key],
      status: source[key]?.status || "missing",
      value: editedFields[key] ?? source[key]?.value ?? "",
    }))
  }, [document, editedFields])

  const runOcr = async () => {
    if (!file) return
    setLoading(true)
    setError("")
    setSuccess("")
    setValidation(null)
    setProgress("Uploading…")
    try {
      setProgress("Running OCR (this may take a minute)…")
      const processed = await api.documents.uploadAndProcess(file, language)
      setDocument(processed)
      const initial: Record<string, string> = {}
      Object.entries(processed.fields || {}).forEach(([k, v]) => {
        initial[k] = v?.value || ""
      })
      setEditedFields(initial)
      setSuccess("OCR complete. Review text and fields before approving.")
      setProgress("")
    } catch (err) {
      setError(formatErrorMessage(err, "OCR failed."))
      setProgress("")
    } finally {
      setLoading(false)
    }
  }

  const saveCorrections = async () => {
    if (!document) return
    setLoading(true)
    setError("")
    try {
      const pages = Object.fromEntries(
        document.pages.map((p) => [String(p.page_number), p.text]),
      )
      await api.documents.saveCorrections(
        document.local_id || document.document_id,
        pages,
      )
      setSuccess("Page text corrections saved.")
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const approveFields = async () => {
    if (!document?.local_id && !document?.document_id) return
    setLoading(true)
    setError("")
    try {
      const approved: Record<string, { value: string | null; status: string; source: string }> =
        {}
      Object.entries(editedFields).forEach(([key, value]) => {
        const trimmed = value.trim()
        approved[key] = {
          value: trimmed || null,
          status: trimmed ? "user_approved" : "missing",
          source: "user_edit",
        }
      })
      await api.documents.approveFields(
        document.local_id || document.document_id,
        approved,
      )
      setSuccess("Approved fields saved. These are marked as user-edited.")
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const runValidation = async () => {
    if (!document) return
    setLoading(true)
    setError("")
    try {
      const result = await api.documents.validate(
        document.local_id || document.document_id,
      )
      setValidation(result)
      setSuccess("Validation report generated.")
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-stack">
      <div className="section-head">
        <div>
          <p className="eyebrow">Document OCR</p>
          <h2>Land-document workspace</h2>
          <p className="subtext">
            PDF, JPG, and PNG · Tamil + English · Review before you trust any
            field.
          </p>
        </div>
        <Link to="/app/history">
          <Button kind="secondary">Processing history</Button>
        </Link>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}
      {progress ? <Alert tone="info">{progress}</Alert> : null}

      <div className="tool-layout">
        <section>
          <label className={`upload-zone ${file ? "has-file" : ""}`}>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null)
                setDocument(null)
                setValidation(null)
                setError("")
                setSuccess("")
              }}
            />
            {file ? (
              <>
                <FileText size={34} />
                <strong>{file.name}</strong>
                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </>
            ) : (
              <>
                <UploadCloud size={38} />
                <strong>Drop land document here</strong>
                <span>PDF, JPG or PNG · up to 50 MB</span>
                <small>Browse files</small>
              </>
            )}
          </label>
          <label className="ocr-language-select">
            <span>OCR language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={loading}
            >
              <option value="ta-en">Tamil + English</option>
              <option value="ta">Tamil</option>
              <option value="en">English</option>
              <option value="auto">Automatic</option>
            </select>
          </label>
          <Button
            className="full"
            onClick={runOcr}
            disabled={!file || loading}
            loading={loading}
          >
            <Sparkles size={16} /> Run OCR
          </Button>
        </section>

        <aside className="report-card">
          <div className="report-head">
            <div>
              <p className="eyebrow">Extracted text</p>
              <h3>{document?.original_name || "Awaiting upload"}</h3>
            </div>
            {document ? <Badge>{document.engine || "Tesseract"}</Badge> : null}
          </div>
          {!document ? (
            <div className="report-empty">
              <FileCheck2 />
              <p>
                Upload a document to run the real OCR pipeline. Results appear
                here for editing.
              </p>
            </div>
          ) : (
            <div className="report-results">
              <div className="ocr-model-meta">
                <span>{document.page_count} page(s)</span>
                <span>{document.model_version || "tesseract"}</span>
              </div>
              {document.pages.map((page) => (
                <div className="ocr-page-result" key={page.page_number}>
                  <div className="field-row">
                    <span>
                      Page {page.page_number} · {page.detected_language}
                    </span>
                    <strong>
                      {page.confidence == null
                        ? "confidence n/a"
                        : `${page.confidence.toFixed(1)}%`}
                    </strong>
                  </div>
                  {page.warnings?.length ? (
                    <p className="ocr-warn">{page.warnings.join(" ")}</p>
                  ) : null}
                  <textarea
                    value={page.text}
                    onChange={(e) =>
                      setDocument((current) =>
                        current
                          ? {
                              ...current,
                              pages: current.pages.map((p) =>
                                p.page_number === page.page_number
                                  ? { ...p, text: e.target.value }
                                  : p,
                              ),
                            }
                          : current,
                      )
                    }
                  />
                </div>
              ))}
              <Button kind="secondary" className="full" onClick={saveCorrections}>
                <Check size={16} /> Save text corrections
              </Button>
              <div className="export-row">
                {(["txt", "json", "pdf"] as const).map((fmt) => (
                  <Button
                    key={fmt}
                    kind="ghost"
                    onClick={() =>
                      api.documents.downloadExport(
                        document.local_id || document.document_id,
                        fmt,
                      )
                    }
                  >
                    <Download size={14} /> {fmt.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {document ? (
        <section className="form-card fields-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Structured fields</p>
              <h2>Review extracted land information</h2>
              <p className="subtext">
                Empty values mean the field was not found—nothing is invented.
                Edits are stored as user-approved.
              </p>
            </div>
          </div>
          <div className="fields-grid">
            {fieldEntries.map((field) => (
              <label key={field.key}>
                <span>
                  {field.label}
                  <Badge tone={field.status === "detected" ? "green" : "amber"}>
                    {field.status}
                  </Badge>
                </span>
                <input
                  value={field.value}
                  onChange={(e) =>
                    setEditedFields((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  placeholder="Not detected — enter manually if known"
                />
              </label>
            ))}
          </div>
          <div className="hero-actions">
            <Button onClick={approveFields} loading={loading}>
              Approve fields
            </Button>
            <Button kind="secondary" onClick={runValidation} loading={loading}>
              Run validation
            </Button>
          </div>
        </section>
      ) : null}

      {validation ? (
        <section className="form-card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Validation</p>
              <h2>Status: {validation.overall_status}</h2>
              <p className="subtext">{validation.disclaimer}</p>
            </div>
            <Badge tone="amber">
              Official verification:{" "}
              {validation.official_verification_performed ? "yes" : "not performed"}
            </Badge>
          </div>
          <ul className="validation-list">
            {validation.checks.map((check) => (
              <li key={check.id} className={`sev-${check.severity}`}>
                <strong>
                  [{check.severity}] {check.title}
                </strong>
                <span>{check.detail}</span>
              </li>
            ))}
          </ul>
          {document?.local_id ? (
            <a
              className="ocr-download"
              href={api.documents.getValidationReportUrl(document.local_id)}
              onClick={async (e) => {
                e.preventDefault()
                const token = await (
                  await import("../lib/firebase")
                ).getFirebaseAuth()?.currentUser?.getIdToken()
                const res = await fetch(
                  api.documents.getValidationReportUrl(document.local_id!),
                  { headers: token ? { Authorization: `Bearer ${token}` } : {} },
                )
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = window.document.createElement("a")
                a.href = url
                a.download = "landai-validation.txt"
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              Download validation report
            </a>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
