import { useEffect, useState } from "react"
import { Heart, MapPin, Search, ShieldCheck } from "lucide-react"
import { api, formatErrorMessage, type Property } from "../services/api"
import { Alert, Badge, Button, EmptyState, money, Skeleton } from "../components/ui"

export default function DiscoverPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [q, setQ] = useState("")
  const [type, setType] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [selected, setSelected] = useState<Property | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = async (nextPage = page) => {
    setLoading(true)
    setError("")
    try {
      const data = await api.properties.search({
        q,
        type,
        maxPrice: maxPrice || undefined,
        page: nextPage,
        pageSize: 8,
        sort: "score_desc",
      })
      setProperties(data.properties)
      setNote(data.data_note || "")
      setTotalPages(data.pagination.totalPages)
      setPage(data.pagination.page)
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleSave = async (property: Property) => {
    try {
      if (property.saved) {
        await api.properties.unsave(property.id)
      } else {
        await api.properties.save(property.id)
      }
      setProperties((rows) =>
        rows.map((p) =>
          p.id === property.id ? { ...p, saved: !p.saved } : p,
        ),
      )
      if (selected?.id === property.id) {
        setSelected({ ...property, saved: !property.saved })
      }
    } catch (err) {
      setError(formatErrorMessage(err))
    }
  }

  return (
    <div className="page-stack">
      <div className="section-head">
        <div>
          <p className="eyebrow">Property discovery</p>
          <h2>Search & recommendations</h2>
          <p className="subtext">
            Filters use your search criteria. Recommendation reasons explain why
            each result appears.
          </p>
        </div>
      </div>

      {note ? <Alert tone="info">{note}</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="filterbar">
        <div className="search-input">
          <Search size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Location or title"
          />
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          <option value="Residential">Residential</option>
          <option value="Plot">Plot</option>
        </select>
        <select value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}>
          <option value="">Any budget</option>
          <option value="5000000">Under ₹50 L</option>
          <option value="10000000">Under ₹1 Cr</option>
          <option value="20000000">Under ₹2 Cr</option>
        </select>
        <Button onClick={() => load(1)}>Search</Button>
      </div>

      {loading ? (
        <div className="property-grid wide">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="skel-card" />
          ))}
        </div>
      ) : properties.length ? (
        <div className="property-grid wide">
          {properties.map((property) => (
            <article className="property-card" key={property.id}>
              <div className="property-image">
                <img src={property.image} alt={property.title} />
                {property.sample_label ? (
                  <Badge tone="amber">Sample</Badge>
                ) : (
                  <Badge>{property.score}% fit</Badge>
                )}
                <button
                  className={`save-button ${property.saved ? "saved" : ""}`}
                  onClick={() => toggleSave(property)}
                  aria-label="Save property"
                >
                  <Heart
                    size={18}
                    fill={property.saved ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <div className="property-content">
                <div className="property-meta">
                  <Badge tone={property.verified ? "green" : "amber"}>
                    {property.verified ? (
                      <>
                        <ShieldCheck size={12} /> Record-linked
                      </>
                    ) : (
                      "Not officially verified"
                    )}
                  </Badge>
                  <span>{property.type}</span>
                </div>
                <h3>{property.title}</h3>
                <p className="location">
                  <MapPin size={14} /> {property.location}
                </p>
                <div className="property-bottom">
                  <div>
                    <strong>{money(property.price)}</strong>
                    <span>{property.area.toLocaleString()} sq ft</span>
                  </div>
                  <Button kind="secondary" onClick={() => setSelected(property)}>
                    Details
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Search />}
          title="No properties found"
          description="No matching records in the configured data source. Adjust filters or add seller listings."
        />
      )}

      {totalPages > 1 ? (
        <div className="pager">
          <Button
            kind="secondary"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
          >
            Previous
          </Button>
          <span>
            Page {page} / {totalPages}
          </span>
          <Button
            kind="secondary"
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      {selected ? (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div
            className="detail-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal
          >
            <img src={selected.image} alt={selected.title} />
            <div className="detail-copy">
              <Badge tone="amber">{selected.sample_label || selected.type}</Badge>
              <h2>{selected.title}</h2>
              <p className="location">
                <MapPin size={14} /> {selected.location}
              </p>
              <div className="detail-numbers">
                <div>
                  <span>Price</span>
                  <strong>{money(selected.price)}</strong>
                </div>
                <div>
                  <span>Area</span>
                  <strong>{selected.area.toLocaleString()} sq ft</strong>
                </div>
                <div>
                  <span>Type</span>
                  <strong>{selected.type}</strong>
                </div>
              </div>
              <div className="match-reasons">
                <h3>Why this result</h3>
                {(selected.recommendation_reasons || []).map((reason) => (
                  <p key={reason}>
                    <ShieldCheck size={14} /> {reason}
                  </p>
                ))}
              </div>
              <p className="subtext">
                {selected.description ||
                  "No additional description provided for this listing."}
              </p>
              <div className="hero-actions">
                <Button onClick={() => toggleSave(selected)}>
                  {selected.saved ? "Unsave" : "Save"}
                </Button>
                <Button kind="secondary" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
