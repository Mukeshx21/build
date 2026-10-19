import { FormEvent, useEffect, useState } from "react"
import { Building2 } from "lucide-react"
import { api, formatErrorMessage, type Property } from "../services/api"
import { Alert, Button, EmptyState, money } from "../components/ui"

export default function SellerPage() {
  const [mine, setMine] = useState<Property[]>([])
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: "",
    location: "",
    price: "",
    area: "",
    type: "Plot",
    description: "",
  })

  const load = async () => {
    try {
      const data = await api.properties.search({
        pageSize: 50,
        sort: "newest",
        mine: 1,
      })
      setMine(data.properties)
    } catch (err) {
      setError(formatErrorMessage(err))
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")
    try {
      await api.properties.create({
        title: form.title,
        location: form.location,
        price: Number(form.price),
        area: Number(form.area),
        type: form.type,
        description: form.description,
      })
      setMessage("Listing published.")
      setForm({
        title: "",
        location: "",
        price: "",
        area: "",
        type: "Plot",
        description: "",
      })
      await load()
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
          <p className="eyebrow">Seller</p>
          <h2>Listings</h2>
          <p className="subtext">
            Publish real listings you own. Sample seed data remains labeled and is
            not claimed as live inventory.
          </p>
        </div>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <form className="form-card" onSubmit={onSubmit}>
        <div className="form-row">
          <label>
            <span>Title</span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            <span>Location</span>
            <input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            <span>Price (INR)</span>
            <input
              required
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </label>
          <label>
            <span>Area (sq ft)</span>
            <input
              required
              type="number"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
            />
          </label>
        </div>
        <label>
          <span>Type</span>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option>Plot</option>
            <option>Residential</option>
          </select>
        </label>
        <label>
          <span>Description</span>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <Button type="submit" loading={loading}>
          Publish listing
        </Button>
      </form>

      {mine.length ? (
        <div className="history-table">
          {mine.map((p) => (
            <div className="history-row" key={p.id}>
              <strong>{p.title}</strong>
              <span>
                {p.location} · {money(p.price)}
              </span>
              <Button
                kind="danger"
                onClick={async () => {
                  try {
                    await api.properties.delete(p.id)
                    setMine((rows) => rows.filter((r) => r.id !== p.id))
                  } catch (err) {
                    setError(formatErrorMessage(err))
                  }
                }}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 />}
          title="No non-sample listings yet"
          description="Publish a listing above. Seed samples stay labeled separately."
        />
      )}
    </div>
  )
}
