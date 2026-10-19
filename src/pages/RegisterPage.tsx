import { FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ShieldCheck } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { UserRole } from "../types/auth"
import { Alert, Button } from "../components/ui"

export default function RegisterPage() {
  const { register, firebaseStatus, serverFirebaseReady } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [role, setRole] = useState<UserRole>("buyer")
  const [agree, setAgree] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const firebaseReady =
    firebaseStatus.configured && serverFirebaseReady !== false

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    if (!firebaseReady) {
      setError("Firebase is not configured. Registration is disabled.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (!agree) {
      setError("Please accept the Terms and Conditions.")
      return
    }
    setLoading(true)
    try {
      const result = await register({
        name,
        email,
        password,
        role,
        agreeTerms: agree,
      })
      navigate(
        result.requiresEmailVerification ? "/verify-email" : "/app",
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-fullscreen">
      <div className="auth-bg-gradient" />
      <div className="auth-container auth-single">
        <div className="auth-form-pane">
          <div className="auth-brand-badge">
            <ShieldCheck size={18} /> LandAI
          </div>
          <h1>Create your account</h1>
          <p className="auth-sub">
            Choose Buyer or Seller once. Your role is stored on the server and
            cannot be changed by an unauthenticated request.
          </p>

          {!firebaseReady ? (
            <Alert tone="warning">
              Firebase Authentication is not configured. See README before
              registering.
            </Alert>
          ) : null}
          {error ? <Alert tone="error">{error}</Alert> : null}

          <form onSubmit={onSubmit} className="auth-form">
            <label>
              <span>Full name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </label>
            <label>
              <span>Confirm password</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
              />
            </label>
            <fieldset className="role-picker">
              <legend>Account type</legend>
              <label>
                <input
                  type="radio"
                  name="role"
                  checked={role === "buyer"}
                  onChange={() => setRole("buyer")}
                />
                Buyer — search, OCR, save properties
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  checked={role === "seller"}
                  onChange={() => setRole("seller")}
                />
                Seller — list properties, manage inquiries, OCR
              </label>
            </fieldset>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              I agree to the Terms. OCR output is not a certified legal copy.
            </label>
            <Button type="submit" className="full" loading={loading}>
              Create account
            </Button>
          </form>
          <p className="auth-footer-link">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
