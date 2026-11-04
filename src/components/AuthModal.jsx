import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check,
  Search,
  Building,
  KeyRound,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
  onAuthenticated
}) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot' | 'reset'
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Registration & Login Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'buyer', // 'buyer' | 'seller'
    agreeTerms: false,
    // Buyer Preferences
    buyerLocation: 'Coimbatore, Tamil Nadu',
    buyerPropertyType: 'Plot',
    buyerMaxBudget: '5000000',
    buyerMinArea: '1200',
    // Seller Preferences
    sellerPropertyLocation: '',
    sellerTiming: 'now', // 'now' | 'later'
    sellerOwnershipType: 'direct_owner', // 'direct_owner' | 'authorized_agent'
  });

  // Forgot / Reset Password state
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  if (!isOpen) return null;

  const update = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (error) setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sign in. Please verify your credentials.');
      }

      if (data.token) {
        localStorage.setItem('landai_token', data.token);
      }
      onAuthenticated(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Network error occurred. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterStep = (e) => {
    e.preventDefault();
    setError('');

    if (step === 1) {
      if (!form.name || form.name.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (!form.email || !form.email.includes('@')) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!form.password || form.password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match. Please verify both password fields.');
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!form.agreeTerms) {
        setError('You must accept the Terms of Service to create an account.');
        return;
      }
      executeRegistration();
    }
  };

  const executeRegistration = async () => {
    setBusy(true);
    setError('');

    const preferences =
      form.role === 'buyer'
        ? {
            location: form.buyerLocation,
            type: form.buyerPropertyType,
            maxBudget: Number(form.buyerMaxBudget) || 0,
            minArea: Number(form.buyerMinArea) || 0,
          }
        : {
            propertyLocation: form.sellerPropertyLocation,
            listingTiming: form.sellerTiming,
            ownershipType: form.sellerOwnershipType,
          };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
          role: form.role,
          agreeTerms: form.agreeTerms,
          preferences,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed. Please try again.');
      }

      if (data.token) {
        localStorage.setItem('landai_token', data.token);
      }
      onAuthenticated(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setBusy(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.reset_token) {
        setResetToken(data.reset_token);
        setSuccessMessage('Reset instructions generated. Enter your new password below.');
        setMode('reset');
      } else {
        setSuccessMessage(data.message || 'If an account exists, reset instructions have been sent.');
      }
    } catch (err) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          password: newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed.');
      }
      setSuccessMessage('Password updated successfully! Please sign in with your new password.');
      setMode('login');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="auth-modal-window" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="auth-modal-grid">
          {/* Left Column: Visual Showcase */}
          <div className="auth-showcase-column">
            <div className="auth-showcase-brand">
              <div className="brand-symbol">
                <ShieldCheck size={18} />
              </div>
              <span className="brand-name">terra</span>
            </div>

            <div className="auth-showcase-content">
              <span className="auth-showcase-eyebrow">INTELLIGENT PROPERTY PLATFORM</span>
              <h1 className="auth-showcase-title">
                Find Your Place
                <br />
                <em>With Confidence.</em>
              </h1>
              <p className="auth-showcase-sub">
                Discover properties. Compare details. Make informed decisions with transparent land records and verified documents.
              </p>
            </div>

            <div className="auth-showcase-card">
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=85"
                alt="Contemporary architecture"
                className="showcase-photo"
              />
              <div className="showcase-caption">
                <span>Verified Legal Record Engine</span>
                <strong>Document Integrity &amp; OCR Analysis</strong>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Form */}
          <div className="auth-form-column">
            {/* Mode Tabs */}
            <div className="auth-mode-tabs">
              <button
                type="button"
                className={`auth-mode-tab ${mode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccessMessage('');
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-mode-tab ${mode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setMode('register');
                  setStep(1);
                  setError('');
                  setSuccessMessage('');
                }}
              >
                Create Account
              </button>
            </div>

            {/* Error & Success Banners */}
            {error && (
              <div className="auth-alert error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="auth-alert success" role="status">
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* 1. SIGN IN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="auth-form-body">
                <div className="form-header">
                  <h2>Welcome back</h2>
                  <p>Enter your credentials to access your account, saved searches, and verified documents.</p>
                </div>

                <div className="input-group">
                  <label htmlFor="login-email">Email Address</label>
                  <input
                    id="login-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="input-group">
                  <div className="label-with-action">
                    <label htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      className="inline-text-btn"
                      onClick={() => {
                        setMode('forgot');
                        setError('');
                        setSuccessMessage('');
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="password-input-wrapper">
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="auth-row-options">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me on this browser</span>
                  </label>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={busy}>
                  {busy ? 'Authenticating…' : 'Sign In'}
                  <ArrowRight size={16} />
                </button>

                <div className="auth-footer-prompt">
                  <span>Don&apos;t have an account yet?</span>
                  <button
                    type="button"
                    className="inline-link"
                    onClick={() => {
                      setMode('register');
                      setStep(1);
                    }}
                  >
                    Create an account
                  </button>
                </div>
              </form>
            )}

            {/* 2. REGISTRATION FORM (MULTI-STEP) */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterStep} className="auth-form-body">
                {/* Step Progress Bar */}
                <div className="step-progress-indicator">
                  <div className="step-labels">
                    <span className={step >= 1 ? 'active' : ''}>1. Account</span>
                    <span className={step >= 2 ? 'active' : ''}>2. Role</span>
                    <span className={step >= 3 ? 'active' : ''}>3. Preferences</span>
                  </div>
                  <div className="step-bar">
                    <div
                      className="step-bar-fill"
                      style={{ width: step === 1 ? '33.3%' : step === 2 ? '66.6%' : '100%' }}
                    />
                  </div>
                </div>

                {/* Step 1: Personal Details */}
                {step === 1 && (
                  <div className="step-content animate-slide">
                    <div className="form-header">
                      <h2>Personal Details</h2>
                      <p>Start with your basic contact information and secure password.</p>
                    </div>

                    <div className="input-group">
                      <label htmlFor="reg-name">Full Name</label>
                      <input
                        id="reg-name"
                        type="text"
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        placeholder="John Doe"
                        required
                        minLength={2}
                      />
                    </div>

                    <div className="input-group">
                      <label htmlFor="reg-email">Email Address</label>
                      <input
                        id="reg-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        placeholder="name@example.com"
                        required
                      />
                    </div>

                    <div className="input-group">
                      <label htmlFor="reg-phone">Mobile Number</label>
                      <input
                        id="reg-phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    </div>

                    <div className="input-group">
                      <label htmlFor="reg-password">Create Password (min. 6 characters)</label>
                      <div className="password-input-wrapper">
                        <input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => update('password', e.target.value)}
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="input-group">
                      <label htmlFor="reg-confirm-password">Confirm Password</label>
                      <div className="password-input-wrapper">
                        <input
                          id="reg-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={form.confirmPassword}
                          onChange={(e) => update('confirmPassword', e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Account Role */}
                {step === 2 && (
                  <div className="step-content animate-slide">
                    <div className="form-header">
                      <h2>Select Your Account Role</h2>
                      <p>Customize your experience according to whether you want to buy or list property.</p>
                    </div>

                    <div className="role-selection-grid">
                      <div
                        className={`role-card ${form.role === 'buyer' ? 'selected' : ''}`}
                        onClick={() => update('role', 'buyer')}
                      >
                        <div className="role-card-header">
                          <div className="role-icon-box">
                            <Search size={20} />
                          </div>
                          {form.role === 'buyer' && <Check size={18} className="role-check-mark" />}
                        </div>
                        <h3>Property Buyer</h3>
                        <p>Search, compare, and verify plots, villas, and residential land with transparent legal analysis.</p>
                        <ul className="role-feature-list">
                          <li>Instant document validation reports</li>
                          <li>Save &amp; track properties of interest</li>
                          <li>Direct seller site-visit inquiries</li>
                        </ul>
                      </div>

                      <div
                        className={`role-card ${form.role === 'seller' ? 'selected' : ''}`}
                        onClick={() => update('role', 'seller')}
                      >
                        <div className="role-card-header">
                          <div className="role-icon-box">
                            <Building size={20} />
                          </div>
                          {form.role === 'seller' && <Check size={18} className="role-check-mark" />}
                        </div>
                        <h3>Property Seller / Owner</h3>
                        <p>List your property with pre-verified document status to attract genuine, qualified buyers.</p>
                        <ul className="role-feature-list">
                          <li>Direct listing management</li>
                          <li>OCR automated document checks</li>
                          <li>Inquiry and site-visit scheduler</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Role Preferences */}
                {step === 3 && (
                  <div className="step-content animate-slide">
                    <div className="form-header">
                      <h2>{form.role === 'buyer' ? 'Buyer Preferences' : 'Seller Listing Preferences'}</h2>
                      <p>Tailor your recommendations and platform configuration.</p>
                    </div>

                    {form.role === 'buyer' ? (
                      <>
                        <div className="input-group">
                          <label htmlFor="pref-location">Preferred Location / City</label>
                          <input
                            id="pref-location"
                            type="text"
                            value={form.buyerLocation}
                            onChange={(e) => update('buyerLocation', e.target.value)}
                            placeholder="e.g. Coimbatore, Bengaluru, Chennai"
                          />
                        </div>

                        <div className="form-row-dual">
                          <div className="input-group">
                            <label htmlFor="pref-type">Property Type</label>
                            <select
                              id="pref-type"
                              value={form.buyerPropertyType}
                              onChange={(e) => update('buyerPropertyType', e.target.value)}
                            >
                              <option value="Plot">Plot / Land</option>
                              <option value="Residential">Residential Site</option>
                              <option value="Villa">Independent Villa</option>
                              <option value="Commercial">Commercial Plot</option>
                            </select>
                          </div>

                          <div className="input-group">
                            <label htmlFor="pref-budget">Max Budget (₹)</label>
                            <input
                              id="pref-budget"
                              type="number"
                              value={form.buyerMaxBudget}
                              onChange={(e) => update('buyerMaxBudget', e.target.value)}
                              placeholder="5000000"
                            />
                          </div>
                        </div>

                        <div className="input-group">
                          <label htmlFor="pref-area">Minimum Land Area (sq. ft.)</label>
                          <input
                            id="pref-area"
                            type="number"
                            value={form.buyerMinArea}
                            onChange={(e) => update('buyerMinArea', e.target.value)}
                            placeholder="1200"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="input-group">
                          <label htmlFor="seller-loc">Property Location (if ready to list)</label>
                          <input
                            id="seller-loc"
                            type="text"
                            value={form.sellerPropertyLocation}
                            onChange={(e) => update('sellerPropertyLocation', e.target.value)}
                            placeholder="e.g. Kovilpalayam, Coimbatore"
                          />
                        </div>

                        <div className="input-group">
                          <label htmlFor="seller-timing">When do you plan to list?</label>
                          <select
                            id="seller-timing"
                            value={form.sellerTiming}
                            onChange={(e) => update('sellerTiming', e.target.value)}
                          >
                            <option value="now">Ready to list immediately</option>
                            <option value="within_month">Within 1 month</option>
                            <option value="exploring">Exploring valuation &amp; document status</option>
                          </select>
                        </div>

                        <div className="input-group">
                          <label htmlFor="seller-ownership">Ownership Capacity</label>
                          <select
                            id="seller-ownership"
                            value={form.sellerOwnershipType}
                            onChange={(e) => update('sellerOwnershipType', e.target.value)}
                          >
                            <option value="direct_owner">Direct Title Owner</option>
                            <option value="authorized_agent">Authorized Family / Representative</option>
                            <option value="builder_promoter">Builder / Layout Promoter</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="terms-checkbox-wrap">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={form.agreeTerms}
                          onChange={(e) => update('agreeTerms', e.target.checked)}
                          required
                        />
                        <span>
                          I agree to the <strong>Terms of Service</strong> and acknowledge that document OCR and consistency checks provide technical extraction and do not independently replace certified title registration.
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Step Navigation Buttons */}
                <div className="step-actions-row">
                  {step > 1 && (
                    <button
                      type="button"
                      className="auth-back-btn"
                      onClick={() => {
                        setStep(step - 1);
                        setError('');
                      }}
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>
                  )}

                  <button type="submit" className="auth-submit-btn flex-grow" disabled={busy}>
                    {busy ? 'Processing…' : step < 3 ? 'Continue' : 'Create Account'}
                    <ArrowRight size={16} />
                  </button>
                </div>

                <div className="auth-footer-prompt">
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    className="inline-link"
                    onClick={() => {
                      setMode('login');
                      setError('');
                    }}
                  >
                    Sign in here
                  </button>
                </div>
              </form>
            )}

            {/* 3. FORGOT PASSWORD VIEW */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="auth-form-body">
                <div className="form-header">
                  <h2>Reset Password</h2>
                  <p>Enter the email address registered with your Terra account to receive instructions.</p>
                </div>

                <div className="input-group">
                  <label htmlFor="forgot-email">Account Email</label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="name@example.com"
                    required
                  />
                </div>

                <button type="submit" className="auth-submit-btn" disabled={busy}>
                  {busy ? 'Requesting…' : 'Request Reset Token'}
                  <KeyRound size={16} />
                </button>

                <div className="auth-footer-prompt">
                  <button
                    type="button"
                    className="inline-link"
                    onClick={() => {
                      setMode('login');
                      setError('');
                      setSuccessMessage('');
                    }}
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* 4. SET NEW PASSWORD VIEW */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="auth-form-body">
                <div className="form-header">
                  <h2>Set New Password</h2>
                  <p>Enter the verification token and choose a secure new password.</p>
                </div>

                <div className="input-group">
                  <label htmlFor="reset-token">Reset Token</label>
                  <input
                    id="reset-token"
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste reset token"
                    required
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="reset-new-pw">New Password (min. 6 characters)</label>
                  <input
                    id="reset-new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="reset-confirm-pw">Confirm New Password</label>
                  <input
                    id="reset-confirm-pw"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                <button type="submit" className="auth-submit-btn" disabled={busy}>
                  {busy ? 'Updating…' : 'Update Password & Sign In'}
                  <Check size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
