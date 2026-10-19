import { useEffect, useState } from "react"
import { History } from "lucide-react"
import { api, formatErrorMessage } from "../services/api"
import { Alert, EmptyState, Skeleton } from "../components/ui"

type HistoryRow = {
  id: number
  action: string
  detail?: string
  original_name?: string
  created_at?: string
}

export default function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    ;(async () => {
      try {
        const data = await api.documents.history()
        setRows(data.history as HistoryRow[])
      } catch (err) {
        setError(formatErrorMessage(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="page-stack">
      <div className="section-head">
        <div>
          <p className="eyebrow">Activity</p>
          <h2>Document processing history</h2>
        </div>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? (
        <Skeleton className="skel-card" />
      ) : rows.length ? (
        <div className="history-table">
          {rows.map((row) => (
            <div key={row.id} className="history-row">
              <strong>{row.action}</strong>
              <span>{row.original_name || row.detail || "—"}</span>
              <small>{row.created_at}</small>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<History />}
          title="No processing history yet"
          description="Upload and process a land document to see activity here."
        />
      )}
    </div>
  )
}
