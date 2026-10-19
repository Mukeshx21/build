import { FormEvent, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Eye, EyeOff, ShieldCheck } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { Alert, Button } from "../components/ui"

export default function LoginPage() {
  const { login, firebaseStatus, serverFirebaseReady, resetPassword } =
    useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [resetMsg, setResetMsg] = useState("")
  const [resetMode, setResetMode] = useState(false)

  const firebaseReady =
    firebaseStatus.configured && serverFirebaseReady !== false

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setResetMsg("")
    if (!firebaseReady) {
      setError(
        "Firebase is not configured. Add VITE_FIREBASE_* and Admin credentials, then restart.",
      )
      return
    }
    setLoading(true)
    try {
      if (resetMode) {
        await resetPassword(email)
        setResetMsg("Password reset email sent. Check your inbox.")
      } else {
        await login(email.trim(), password)
        navigate("/app")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.")
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
          <h1>{resetMode ? "Reset password" : "Welcome back"}</h1>
          <p className="auth-sub">
            Sign in with your email. Roles are stored securely on the server.
          </p>

          {!firebaseStatus.configured || serverFirebaseReady === false ? (
            <Alert tone="warning">
              Firebase Authentication is not fully configured.
              {!firebaseStatus.configured
                ? ` Missing: ${firebaseStatus.missing.join(", ") || "client keys"}.`
                : " Server Admin SDK credentials are missing."}{" "}
              See README for setup. Authentication will not work until configured.
            </Alert>
          ) : null}

          {error ? <Alert tone="error">{error}</Alert> : null}
          {resetMsg ? <Alert tone="success">{resetMsg}</Alert> : null}

          <form onSubmit={onSubmit} className="auth-form">
            <label>
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            {!resetMode ? (
              <label>
                <span>Password</span>
                <div className="password-field">
                  <input
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label="Toggle password visibility"
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            ) : null}
            <Button type="submit" className="full" loading={loading}>
              {resetMode ? "Send reset email" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setResetMode(!resetMode)
              setError("")
              setResetMsg("")
            }}
          >
            {resetMode ? "Back to sign in" : "Forgot password?"}
          </button>
          <p className="auth-footer-link">
            New to LandAI? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
