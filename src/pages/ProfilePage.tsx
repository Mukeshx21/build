import { FormEvent, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { Alert, Button } from "../components/ui"
import { formatErrorMessage } from "../services/api"

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [name, setName] = useState(user?.name || "")
  const [phone, setPhone] = useState(user?.phone || "")
  const [location, setLocation] = useState(user?.preferences?.location || "")
  const [type, setType] = useState(user?.preferences?.type || "")
  const [maxBudget, setMaxBudget] = useState(
    String(user?.preferences?.maxBudget || ""),
  )
  const [minArea, setMinArea] = useState(String(user?.preferences?.minArea || ""))
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")
    try {
      await updateProfile({
        name,
        phone,
        preferences: {
          location: location || undefined,
          type: type || undefined,
          maxBudget: maxBudget ? Number(maxBudget) : undefined,
          minArea: minArea ? Number(minArea) : undefined,
        },
      })
      setMessage("Profile updated.")
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
          <p className="eyebrow">Account</p>
          <h2>Profile & preferences</h2>
          <p className="subtext">
            Preferences influence recommendation explanations. They are never used
            to encode sensitive personal characteristics.
          </p>
        </div>
      </div>
      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}
      <form className="form-card" onSubmit={onSubmit}>
        <div className="form-row">
          <label>
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <span>Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
        </div>
        <label>
          <span>Email (managed by Firebase)</span>
          <input value={user?.email || ""} disabled />
        </label>
        <label>
          <span>Role (server-assigned)</span>
          <input value={user?.role || ""} disabled />
        </label>
        <div className="form-row">
          <label>
            <span>Preferred location</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Whitefield"
            />
          </label>
          <label>
            <span>Preferred type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Any</option>
              <option value="Residential">Residential</option>
              <option value="Plot">Plot</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            <span>Max budget (INR)</span>
            <input
              type="number"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
            />
          </label>
          <label>
            <span>Min area (sq ft)</span>
            <input
              type="number"
              value={minArea}
              onChange={(e) => setMinArea(e.target.value)}
            />
          </label>
        </div>
        <Button type="submit" loading={loading}>
          Save profile
        </Button>
      </form>
    </div>
  )
}
