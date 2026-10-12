import { useState, FormEvent } from "react";
import {
  Building2, Eye, EyeOff, Lock, Mail, UserRound, ArrowRight, CheckCircle2,
  AlertCircle, ShieldCheck, Sparkles, MapPin, Check, X, FileText
} from "lucide-react";
import { User, UserRole, AuthResponse } from "../types/auth";

interface AuthPageProps {
  onLoginSuccess: (user: User) => void;
  initialMode?: "login" | "register";
}

export default function AuthPage({ onLoginSuccess, initialMode = "login" }: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register Form State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regShowConfirmPassword, setRegShowConfirmPassword] = useState(false);
  const [regRole, setRegRole] = useState<UserRole>("buyer");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotError, setForgotError] = useState("");

  const [showTermsModal, setShowTermsModal] = useState(false);

  // Email format validator
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isLoginEmailValid = emailRegex.test(loginEmail.trim());

  // Handle Login Submit
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!loginEmail.trim()) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    if (!isLoginEmailValid) {
      setErrorMsg("Please enter a valid email address (e.g., name@domain.com).");
      return;
    }

    if (!loginPassword) {
      setErrorMsg("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
          rememberMe
        })
      });

      const data: AuthResponse = await response.json();

      if (!response.ok || !data.success || !data.user) {
        throw new Error(data.error || "Login failed. Please check your email and password.");
      }

      if (data.token) {
        localStorage.setItem("landai_token", data.token);
      }

      setSuccessMsg(`Welcome back, ${data.user.name}! Redirecting…`);
      setTimeout(() => {
        onLoginSuccess(data.user!);
      }, 500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Register Submit
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Client-side validations
    if (!regName.trim() || regName.trim().length < 2) {
      setErrorMsg("Please enter your full name (minimum 2 characters).");
      return;
    }

    if (!emailRegex.test(regEmail.trim())) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    if (regPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMsg("Passwords do not match. Please verify both entries.");
      return;
    }

    if (!agreeTerms) {
      setErrorMsg("Please accept the Terms and Conditions to proceed.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          confirmPassword: regConfirmPassword,
          role: regRole,
          agreeTerms
        })
      });

      const data: AuthResponse = await response.json();

      if (!response.ok || !data.success || !data.user) {
        throw new Error(data.error || "Registration failed. Please review your details.");
      }

      if (data.token) {
        localStorage.setItem("landai_token", data.token);
      }

      setSuccessMsg(data.message || "Account created successfully! Welcome to LandAI.");
      setTimeout(() => {
        onLoginSuccess(data.user!);
      }, 500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Direct Password Reset
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotMsg("");

    if (!forgotEmail.trim() || !emailRegex.test(forgotEmail.trim())) {
      setForgotError("Please enter a valid email address.");
      return;
    }

    if (newPassword.length < 6) {
      setForgotError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotError("Passwords do not match.");
      return;
    }

    setForgotLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          newPassword,
          confirmPassword: confirmNewPassword
        })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Password reset failed.");
      }

      setSuccessMsg(data.message || "Password reset successful! Please log in with your new password.");
      setShowForgotModal(false);
      setMode("login");
      setLoginEmail(forgotEmail.trim());
      setLoginPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="auth-fullscreen">
      {/* Background Ambience */}
      <div className="auth-bg-gradient" />
      <div className="auth-bg-pattern" />

      <div className="auth-container">
        {/* Left Side: Brand Visual & Value Proposition */}
        <div className="auth-visual-pane">
          <div className="auth-visual-top">
            <div className="auth-brand-badge">
              <span className="auth-logo-icon"><Building2 size={22} /></span>
              <div>
                <strong>LandAI</strong>
                <small>Property Recommendation Engine</small>
              </div>
            </div>
          </div>

          <div className="auth-visual-content">
            <span className="auth-pill-tag">
              <Sparkles size={14} /> AI-Powered Real Estate
            </span>
            <h1>Find verified land.<br /><em>Invest with intelligence.</em></h1>
            <p>
              Connect directly with verified land opportunities, AI-driven legal title analysis,
              live construction estimators, and interactive 3D massing previews.
            </p>

            <div className="auth-feature-cards">
              <div className="auth-feature-card">
                <span className="feature-icon"><ShieldCheck size={18} /></span>
                <div>
                  <strong>Document Intelligence</strong>
                  <p>Automatic title deed extraction & boundary risk checks</p>
                </div>
              </div>
              <div className="auth-feature-card">
                <span className="feature-icon"><MapPin size={18} /></span>
                <div>
                  <strong>Curated Land Plots</strong>
                  <p>Bengaluru top corridor plots with verified road connectivity</p>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-visual-footer">
            <div className="auth-testimonial">
              <div className="quote-badge">98.6% Accuracy</div>
              <p>&ldquo;LandAI clarified the legal survey risks and helped us finalize our residential plot within a week.&rdquo;</p>
              <span>— Bangalore Urban Property Buyers Guild</span>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Card */}
        <div className="auth-form-pane">
          <div className="auth-card">
            {/* Top Switcher / Navigation */}
            <div className="auth-card-top">
              <div className="auth-tabs">
                <button
                  type="button"
                  id="tab-login"
                  className={`auth-tab ${mode === "login" ? "active" : ""}`}
                  onClick={() => { setMode("login"); setErrorMsg(""); setSuccessMsg(""); }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  id="tab-register"
                  className={`auth-tab ${mode === "register" ? "active" : ""}`}
                  onClick={() => { setMode("register"); setErrorMsg(""); setSuccessMsg(""); }}
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Headings */}
            <div className="auth-headings">
              {mode === "login" ? (
                <>
                  <h2>Welcome Back to LandAI — Find Your Perfect Property.</h2>
                  <p className="auth-subtext">
                    Sign in to access your properties, legal reports, and AI recommendations.
                  </p>
                </>
              ) : (
                <>
                  <h2>Create Your LandAI Account</h2>
                  <p className="auth-subtext">
                    Select your account type and start exploring verified land plots or managing listings.
                  </p>
                </>
              )}
            </div>

            {/* Alerts */}
            {errorMsg && (
              <div className="auth-alert error-alert" role="alert">
                <AlertCircle size={17} />
                <span>{errorMsg}</span>
                <button type="button" onClick={() => setErrorMsg("")} className="alert-close"><X size={14} /></button>
              </div>
            )}

            {successMsg && (
              <div className="auth-alert success-alert" role="status">
                <CheckCircle2 size={17} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1. LOGIN FORM */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="auth-form" noValidate>
                <div className="form-group">
                  <div className="form-label-row">
                    <label htmlFor="login-email">Email Address</label>
                    {loginEmail && (
                      <span className={`email-status-badge ${isLoginEmailValid ? "valid" : "invalid"}`}>
                        {isLoginEmailValid ? (
                          <>
                            <Check size={12} /> Valid format
                          </>
                        ) : (
                          "Invalid format"
                        )}
                      </span>
                    )}
                  </div>
                  <div className="input-with-icon">
                    <Mail size={17} className="input-icon" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      autoComplete="email"
                    />
                    {isLoginEmailValid && <Check size={15} className="input-valid-icon" />}
                  </div>
                </div>

                <div className="form-group">
                  <div className="form-label-row">
                    <label htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      className="forgot-link"
                      onClick={() => {
                        setShowForgotModal(true);
                        setForgotEmail(loginEmail);
                        setForgotError("");
                        setForgotMsg("");
                        setNewPassword("");
                        setConfirmNewPassword("");
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="input-with-icon">
                    <Lock size={17} className="input-icon" />
                    <input
                      id="login-password"
                      type={loginShowPassword ? "text" : "password"}
                      required
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="pw-toggle-btn"
                      onClick={() => setLoginShowPassword(!loginShowPassword)}
                      aria-label={loginShowPassword ? "Hide password" : "Show password"}
                    >
                      {loginShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-remember-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      id="remember-me"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  id="btn-login-submit"
                  className="btn btn-primary auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" /> Signing in…
                    </>
                  ) : (
                    <>
                      Sign In to LandAI <ArrowRight size={17} />
                    </>
                  )}
                </button>

                <div className="auth-footer-text">
                  <p>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      id="link-go-to-create-account"
                      className="text-link"
                      onClick={() => {
                        setMode("register");
                        setErrorMsg("");
                        setSuccessMsg("");
                      }}
                    >
                      Create Account
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* 2. REGISTRATION FORM */}
            {mode === "register" && (
              <form onSubmit={handleRegister} className="auth-form" noValidate>
                <div className="form-group">
                  <label htmlFor="reg-name">Full Name</label>
                  <div className="input-with-icon">
                    <UserRound size={17} className="input-icon" />
                    <input
                      id="reg-name"
                      type="text"
                      required
                      placeholder="Enter your full name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="reg-email">Email Address</label>
                  <div className="input-with-icon">
                    <Mail size={17} className="input-icon" />
                    <input
                      id="reg-email"
                      type="email"
                      required
                      placeholder="name@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Account Type Selection */}
                <div className="form-group">
                  <label>Account Type</label>
                  <div className="role-selector-grid">
                    <button
                      type="button"
                      id="role-buyer-btn"
                      className={`role-option-card ${regRole === "buyer" ? "selected" : ""}`}
                      onClick={() => setRegRole("buyer")}
                    >
                      <div className="role-card-header">
                        <UserRound size={18} />
                        <strong>Property Buyer</strong>
                        {regRole === "buyer" && <Check size={16} className="role-check" />}
                      </div>
                      <p>Browse listings, legal analysis, 3D building studio & map visits</p>
                    </button>

                    <button
                      type="button"
                      id="role-seller-btn"
                      className={`role-option-card ${regRole === "seller" ? "selected" : ""}`}
                      onClick={() => setRegRole("seller")}
                    >
                      <div className="role-card-header">
                        <Building2 size={18} />
                        <strong>Property Seller</strong>
                        {regRole === "seller" && <Check size={16} className="role-check" />}
                      </div>
                      <p>List land plots, manage listings, view buyer enquiries & requests</p>
                    </button>
                  </div>
                </div>

                <div className="form-row-two">
                  <div className="form-group">
                    <label htmlFor="reg-password">Password</label>
                    <div className="input-with-icon">
                      <Lock size={17} className="input-icon" />
                      <input
                        id="reg-password"
                        type={regShowPassword ? "text" : "password"}
                        required
                        placeholder="Min 6 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="pw-toggle-btn"
                        onClick={() => setRegShowPassword(!regShowPassword)}
                        aria-label="Toggle password visibility"
                      >
                        {regShowPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="reg-confirm-password">Confirm Password</label>
                    <div className="input-with-icon">
                      <Lock size={17} className="input-icon" />
                      <input
                        id="reg-confirm-password"
                        type={regShowConfirmPassword ? "text" : "password"}
                        required
                        placeholder="Re-enter password"
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="pw-toggle-btn"
                        onClick={() => setRegShowConfirmPassword(!regShowConfirmPassword)}
                        aria-label="Toggle confirm password visibility"
                      >
                        {regShowConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="form-terms-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      id="agree-terms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />
                    <span>
                      I agree to the{" "}
                      <button
                        type="button"
                        className="terms-link-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTermsModal(true);
                        }}
                      >
                        Terms and Conditions
                      </button>{" "}
                      and Privacy Policy
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  id="btn-register-submit"
                  className="btn btn-primary auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" /> Creating account…
                    </>
                  ) : (
                    <>
                      Create Account <ArrowRight size={17} />
                    </>
                  )}
                </button>

                <div className="auth-footer-text">
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      id="link-go-to-login"
                      className="text-link"
                      onClick={() => {
                        setMode("login");
                        setErrorMsg("");
                        setSuccessMsg("");
                      }}
                    >
                      Login
                    </button>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="modal-backdrop">
          <div className="forgot-modal">
            <button
              className="modal-close"
              onClick={() => setShowForgotModal(false)}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="modal-header-icon">
              <Lock size={22} />
            </div>

            <h3>Reset Your Password</h3>
            <p className="modal-desc">
              Enter your registered email address and choose a new password.
            </p>

            {forgotError && (
              <div className="auth-alert error-alert">
                <AlertCircle size={15} />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotMsg && (
              <div className="auth-alert success-alert">
                <CheckCircle2 size={15} />
                <span>{forgotMsg}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="forgot-form">
              <div className="form-group">
                <label>Registered Email Address</label>
                <div className="input-with-icon">
                  <Mail size={17} className="input-icon" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Re-enter new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>

              <div className="modal-buttons-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowForgotModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Resetting…" : "Set New Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TERMS AND CONDITIONS MODAL */}
      {showTermsModal && (
        <div className="modal-backdrop">
          <div className="terms-modal">
            <button
              className="modal-close"
              onClick={() => setShowTermsModal(false)}
              aria-label="Close terms modal"
            >
              <X size={18} />
            </button>

            <div className="terms-header">
              <span className="terms-icon"><FileText size={20} /></span>
              <div>
                <h3>LandAI Terms & Conditions</h3>
                <small>Platform User Agreement & Property Trust Standards</small>
              </div>
            </div>

            <div className="terms-body">
              <h4>1. Platform Purpose</h4>
              <p>
                LandAI is an AI-powered real estate intelligence platform designed to connect verified
                buyers with legitimate property sellers and developers.
              </p>

              <h4>2. Document Verification & Legal Disclaimer</h4>
              <p>
                Document AI models perform automated optical character recognition, encumbrance
                cross-referencing, and survey schedule comparisons. While our models achieve 98.6%
                confidence, final legal due diligence must always be validated by qualified legal counsel.
              </p>

              <h4>3. Buyer & Seller Commitments</h4>
              <p>
                Sellers agree that all plot titles, pricing figures, boundary measurements, and municipal
                approvals uploaded to LandAI are accurate. Buyers agree to schedule site visits in good
                faith.
              </p>

              <h4>4. Data Privacy & Password Security</h4>
              <p>
                User passwords are encrypted with bcrypt hashing. Session identifiers are protected with
                secure cookies. We do not sell user data to third-party marketing companies.
              </p>
            </div>

            <div className="terms-footer">
              <button
                type="button"
                className="btn btn-primary full"
                onClick={() => {
                  setAgreeTerms(true);
                  setShowTermsModal(false);
                }}
              >
                I Accept & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
