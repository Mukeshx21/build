import { useEffect, useState } from "react"
import { Bookmark, MapPin } from "lucide-react"
import { api, formatErrorMessage, type Property } from "../services/api"
import { Alert, Button, EmptyState, money, Skeleton } from "../components/ui"

export default function SavedPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.properties.getSaved()
      setProperties(data.properties)
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="page-stack">
      <div className="section-head">
        <div>
          <p className="eyebrow">Saved</p>
          <h2>Saved properties</h2>
        </div>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {loading ? (
        <Skeleton className="skel-card" />
      ) : properties.length ? (
        <div className="property-grid">
          {properties.map((p) => (
            <article className="property-card" key={p.id}>
              <div className="property-image">
                <img src={p.image} alt={p.title} />
              </div>
              <div className="property-content">
                <h3>{p.title}</h3>
                <p className="location">
                  <MapPin size={14} /> {p.location}
                </p>
                <div className="property-bottom">
                  <strong>{money(p.price)}</strong>
                  <Button
                    kind="secondary"
                    onClick={async () => {
                      await api.properties.unsave(p.id)
                      setProperties((rows) =>
                        rows.filter((row) => row.id !== p.id),
                      )
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Bookmark />}
          title="No saved properties"
          description="Save listings from Discover to revisit them here."
        />
      )}
    </div>
  )
}
