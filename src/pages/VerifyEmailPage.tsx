import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { Alert, Button } from "../components/ui"

export default function VerifyEmailPage() {
  const {
    firebaseUser,
    resendVerification,
    refreshProfile,
    logout,
    requiresEmailVerification,
  } = useAuth()
  const navigate = useNavigate()
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const onResend = async () => {
    setError("")
    setMessage("")
    setLoading(true)
    try {
      await resendVerification()
      setMessage("Verification email sent. Check your inbox and spam folder.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend email.")
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setError("")
    setLoading(true)
    try {
      await refreshProfile()
      if (!requiresEmailVerification) {
        navigate("/app")
      } else {
        setMessage("Email still unverified. Open the link from Firebase, then try again.")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh status.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-fullscreen">
      <div className="auth-bg-gradient" />
      <div className="auth-container auth-single">
        <div className="auth-form-pane verify-pane">
          <Mail size={36} className="verify-icon" />
          <h1>Verify your email</h1>
          <p className="auth-sub">
            We sent a verification link to{" "}
            <strong>{firebaseUser?.email || "your email"}</strong> using Firebase
            Authentication. Verify before accessing protected LandAI features.
          </p>
          {error ? <Alert tone="error">{error}</Alert> : null}
          {message ? <Alert tone="success">{message}</Alert> : null}
          <div className="hero-actions" style={{ marginTop: 16 }}>
            <Button onClick={onResend} loading={loading}>
              Resend verification email
            </Button>
            <Button kind="secondary" onClick={onRefresh} loading={loading}>
              I&apos;ve verified — continue
            </Button>
          </div>
          <p className="auth-footer-link">
            <button
              type="button"
              className="linkish"
              onClick={async () => {
                await logout()
                navigate("/login")
              }}
            >
              Sign out
            </button>
            {" · "}
            <Link to="/">Home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
