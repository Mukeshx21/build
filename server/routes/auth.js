import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import db from "../db.js";
import {
  authenticate,
  signToken,
  setAuthCookie,
  clearAuthCookie,
} from "../middleware/auth.js";

const router = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = new Set(["buyer", "seller", "agent", "investor", "broker"]);

router.get("/status", (_req, res) => {
  return res.json({
    configured: true,
    service: "LandAI Native Authentication (JWT + SQLite)",
    message: "Authentication engine is ready.",
  });
});

/**
 * Register a new LandAI user account.
 * Requires: name, email, password, confirmPassword, role ('buyer' | 'seller'), agreeTerms (boolean)
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword, role, agreeTerms, phone, preferences } = req.body || {};

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        error: "Please enter your full name (at least 2 characters).",
      });
    }

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        error: "Please enter a valid email address.",
      });
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters long.",
      });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        error: "Passwords do not match. Please verify both password fields.",
      });
    }

    const cleanRole = String(role || "buyer").trim().toLowerCase();
    if (!ALLOWED_ROLES.has(cleanRole)) {
      return res.status(400).json({
        error: "Please select a valid account type: Buyer or Seller.",
      });
    }

    if (!agreeTerms) {
      return res.status(400).json({
        error: "You must accept the Terms of Service to create an account.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    console.log(`[Auth] Registration started for email: ${cleanEmail}, role: ${cleanRole}`);

    // Duplicate account prevention
    const existing = db
      .prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE")
      .get(cleanEmail);

    if (existing) {
      return res.status(409).json({
        error: "An account with this email address already exists. Please sign in instead.",
      });
    }

    // Map extended roles to valid database role constraint (buyer | seller)
    const dbRole = (cleanRole === "seller" || cleanRole === "agent" || cleanRole === "broker") ? "seller" : "buyer";

    // Normalize buyer & seller preferences
    let normalizedPreferences = {};
    if (preferences && typeof preferences === "object") {
      const loc = String(preferences.location || preferences.preferred_location || preferences.city || "").trim();
      const propType = String(preferences.type || preferences.property_type || "Plot").trim();
      const budget = Number(String(preferences.maxBudget || preferences.max_budget || 0).replace(/[^0-9.]/g, "")) || 0;
      const area = Number(String(preferences.minArea || preferences.min_land_area || 0).replace(/[^0-9.]/g, "")) || 0;

      normalizedPreferences = {
        location: loc,
        preferred_location: loc,
        type: propType,
        property_type: propType,
        maxBudget: budget,
        max_budget: budget,
        minArea: area,
        min_land_area: area,
        propertyLocation: String(preferences.propertyLocation || preferences.property_location || "").trim(),
        listingTiming: String(preferences.listingTiming || preferences.listing_timing || "now").trim(),
        ownershipType: String(preferences.ownershipType || preferences.ownership_type || "direct_owner").trim(),
        role: cleanRole,
        ...preferences,
      };
    }

    // Secure password hashing with bcryptjs (salt rounds = 10)
    const passwordHash = await bcrypt.hash(password, 10);

    const insert = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, phone, preferences_json, email_verified)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `);

    const result = insert.run(
      name.trim(),
      cleanEmail,
      passwordHash,
      dbRole,
      typeof phone === "string" ? phone.trim().slice(0, 32) : "",
      JSON.stringify(normalizedPreferences),
    );

    const userId = Number(result?.lastInsertRowid);
    if (!userId || userId <= 0) {
      throw new Error("Database insertion did not return a valid user ID.");
    }

    const user = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      role: cleanRole,
      phone: typeof phone === "string" ? phone.trim().slice(0, 32) : "",
      preferences: normalizedPreferences,
    };

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user,
    });
  } catch (err) {
    console.error(`[Auth] Registration error for ${req.body?.email || "unknown"}: ${err.name} - ${err.message}`);
    if (err.message && (err.message.includes("UNIQUE constraint") || err.code === "SQLITE_CONSTRAINT")) {
      return res.status(409).json({
        error: "An account with this email address already exists. Please sign in instead.",
      });
    }
    return res.status(500).json({
      error: err.message || "Unable to complete registration. Please try again.",
    });
  }
});

/**
 * Sign in using email and password.
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        error: "Please enter your email address.",
      });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        error: "Please enter your password.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userRow = db
      .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
      .get(cleanEmail);

    if (!userRow || !userRow.password_hash) {
      return res.status(401).json({
        error: "Invalid email or password. Please check your credentials.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, userRow.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({
        error: "Invalid email or password. Please check your credentials.",
      });
    }

    const user = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      phone: userRow.phone || "",
      preferences: safeParse(userRow.preferences_json, {}),
      created_at: userRow.created_at,
      updated_at: userRow.updated_at,
    };

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: "Welcome back!",
      token,
      user,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      error: "Unable to process login. Please try again.",
    });
  }
});

/**
 * Sign out - clears the HTTP-only session cookie.
 */
router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.json({
    success: true,
    message: "Signed out successfully.",
  });
});

router.post("/forgot-password", (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const user = EMAIL_REGEX.test(email)
      ? db.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE").get(email)
      : null;
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(user.id);
      db.prepare("INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '+30 minutes'))")
        .run(tokenHash, user.id);
      if (process.env.NODE_ENV !== "production") {
        return res.json({ message: "If an account exists, reset instructions are ready.", reset_token: rawToken });
      }
    }
    return res.json({ message: "If an account exists, reset instructions have been sent." });
});

router.post("/reset-password", async (req, res) => {
    const { token, password, confirmPassword } = req.body || {};
    if (typeof token !== "string" || token.length < 32 || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "A valid reset token and a password of at least 6 characters are required." });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match." });
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const reset = db.prepare(
      "SELECT * FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP",
    ).get(tokenHash);
    if (!reset) return res.status(400).json({ error: "This reset link is invalid or expired." });
    const passwordHash = await bcrypt.hash(password, 10);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(passwordHash, reset.user_id);
    db.prepare("UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ?").run(tokenHash);
    return res.json({ success: true, message: "Password reset successfully. You can now sign in." });
});

/**
 * Get currently authenticated user profile.
 */
router.get("/me", authenticate, (req, res) => {
  return res.json({ user: req.user });
});

/**
 * Update authenticated user profile.
 */
router.patch("/me", authenticate, (req, res) => {
  try {
    const { name, phone, preferences, role } = req.body || {};
    const updates = [];
    const values = [];

    if (typeof name === "string" && name.trim().length >= 2) {
      updates.push("name = ?");
      values.push(name.trim());
    }
    if (typeof phone === "string") {
      updates.push("phone = ?");
      values.push(phone.trim().slice(0, 32));
    }
    if (preferences && typeof preferences === "object") {
      updates.push("preferences_json = ?");
      values.push(JSON.stringify(preferences));
    }
    if (role && ALLOWED_ROLES.has(String(role).toLowerCase())) {
      updates.push("role = ?");
      values.push(String(role).toLowerCase());
    }

    if (!updates.length) {
      return res.status(400).json({ error: "No valid profile fields to update." });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const userRow = db
      .prepare(
        `SELECT id, name, email, role, phone, preferences_json, created_at, updated_at
         FROM users WHERE id = ?`,
      )
      .get(req.user.id);

    const user = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      phone: userRow.phone || "",
      preferences: safeParse(userRow.preferences_json, {}),
      created_at: userRow.created_at,
      updated_at: userRow.updated_at,
    };

    // Re-issue updated token if role or name changed
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    setAuthCookie(res, token);

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      token,
      user,
    });
  } catch (err) {
    console.error("Profile update error:", err);
    return res.status(500).json({ error: "Could not update profile." });
  }
});

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export default router;
