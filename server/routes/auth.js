import { Router } from "express";
import db from "../db.js";
import {
  authenticate,
  requireFirebaseConfigured,
} from "../middleware/auth.js";
import { getFirebaseAdminStatus, verifyIdToken } from "../firebase.js";

const router = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = new Set(["buyer", "seller"]);

router.get("/status", (_req, res) => {
  const status = getFirebaseAdminStatus();
  res.json({
    configured: status.configured,
    message: status.configured
      ? "Firebase Admin is ready."
      : status.error,
  });
});

/**
 * Register / sync profile after Firebase client Auth succeeds.
 * Role is accepted ONLY when creating a brand-new profile.
 * Existing profiles never accept a client-supplied role override.
 */
router.post("/register", requireFirebaseConfigured, async (req, res) => {
  try {
    const { idToken, name, role, agreeTerms } = req.body || {};

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "Firebase ID token is required." });
    }
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({
        error: "Please enter your full name (minimum 2 characters).",
      });
    }
    if (!agreeTerms) {
      return res.status(400).json({
        error: "You must accept the Terms and Conditions to proceed.",
      });
    }

    const cleanRole = String(role || "").toLowerCase();
    if (!ALLOWED_ROLES.has(cleanRole)) {
      return res.status(400).json({
        error: "Please select an account type: Buyer or Seller.",
      });
    }

    const decoded = await verifyIdToken(idToken);
    if (!decoded.email || !EMAIL_REGEX.test(decoded.email)) {
      return res.status(400).json({
        error: "Firebase account is missing a valid email address.",
      });
    }

    const email = decoded.email.trim().toLowerCase();
    const existingByUid = db
      .prepare("SELECT * FROM users WHERE firebase_uid = ?")
      .get(decoded.uid);
    const existingByEmail = db
      .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
      .get(email);

    if (existingByUid || existingByEmail) {
      return res.status(409).json({
        error: "An account with this email already exists. Please sign in.",
      });
    }

    const insert = db.prepare(`
      INSERT INTO users (firebase_uid, name, email, role, is_verified, password_hash)
      VALUES (?, ?, ?, ?, ?, NULL)
    `);
    const result = insert.run(
      decoded.uid,
      name.trim(),
      email,
      cleanRole,
      decoded.email_verified ? 1 : 0,
    );

    const user = {
      id: Number(result.lastInsertRowid),
      firebase_uid: decoded.uid,
      name: name.trim(),
      email,
      role: cleanRole,
      is_verified: Boolean(decoded.email_verified),
      email_verified: Boolean(decoded.email_verified),
      phone: "",
      preferences: {},
    };

    return res.status(201).json({
      success: true,
      message: decoded.email_verified
        ? "Account created successfully."
        : "Account created. Please verify your email before full access.",
      user,
      requiresEmailVerification: !decoded.email_verified,
    });
  } catch (err) {
    if (err?.code === "FIREBASE_NOT_CONFIGURED") {
      return res.status(503).json({
        error: "Firebase Authentication is not configured on the server.",
        configured: false,
      });
    }
    console.error("Registration error:", err?.code || err?.message || err);
    return res.status(401).json({
      error: "Could not verify Firebase credentials. Please try again.",
    });
  }
});

/**
 * Exchange a Firebase ID token for the LandAI profile.
 * Does not accept role from the client.
 */
router.post("/session", requireFirebaseConfigured, async (req, res) => {
  try {
    const { idToken } = req.body || {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "Firebase ID token is required." });
    }

    const decoded = await verifyIdToken(idToken);
    let user = db
      .prepare("SELECT * FROM users WHERE firebase_uid = ?")
      .get(decoded.uid);

    if (!user && decoded.email) {
      user = db
        .prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE")
        .get(decoded.email);
      if (user) {
        db.prepare(
          "UPDATE users SET firebase_uid = ?, is_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        ).run(decoded.uid, decoded.email_verified ? 1 : 0, user.id);
        user.firebase_uid = decoded.uid;
      }
    }

    if (!user) {
      return res.status(404).json({
        error: "No LandAI profile found. Please complete registration.",
        code: "PROFILE_MISSING",
      });
    }

    db.prepare(
      "UPDATE users SET is_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).run(decoded.email_verified ? 1 : 0, user.id);

    return res.json({
      success: true,
      user: {
        id: user.id,
        firebase_uid: decoded.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        is_verified: Boolean(decoded.email_verified),
        email_verified: Boolean(decoded.email_verified),
        phone: user.phone || "",
        preferences: safeParse(user.preferences_json, {}),
        created_at: user.created_at,
      },
      requiresEmailVerification: !decoded.email_verified,
    });
  } catch (err) {
    if (err?.code === "FIREBASE_NOT_CONFIGURED") {
      return res.status(503).json({
        error: "Firebase Authentication is not configured on the server.",
        configured: false,
      });
    }
    return res.status(401).json({
      error: "Invalid or expired Firebase session.",
    });
  }
});

router.get("/me", authenticate, (req, res) => {
  return res.json({ user: req.user });
});

router.patch("/me", authenticate, (req, res) => {
  try {
    const { name, phone, preferences } = req.body || {};
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

    if (!updates.length) {
      return res.status(400).json({ error: "No valid profile fields to update." });
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const user = db
      .prepare(
        `SELECT id, firebase_uid, name, email, role, is_verified, phone, preferences_json, created_at, updated_at
         FROM users WHERE id = ?`,
      )
      .get(req.user.id);

    return res.json({
      success: true,
      user: {
        id: user.id,
        firebase_uid: user.firebase_uid,
        name: user.name,
        email: user.email,
        role: user.role,
        is_verified: Boolean(user.is_verified),
        email_verified: req.user.email_verified,
        phone: user.phone || "",
        preferences: safeParse(user.preferences_json, {}),
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (err) {
    console.error("Profile update error:", err);
    return res.status(500).json({ error: "Could not update profile." });
  }
});

router.post("/logout", (_req, res) => {
  return res.json({ success: true, message: "Signed out on the client." });
});

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export default router;
