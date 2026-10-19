import db from "../db.js";
import { verifyIdToken, getFirebaseAdminStatus } from "../firebase.js";

function extractBearerToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  return null;
}

export function requireFirebaseConfigured(req, res, next) {
  const status = getFirebaseAdminStatus();
  if (!status.configured) {
    return res.status(503).json({
      error: "Firebase Authentication is not configured on the server.",
      setup: status.error,
      configured: false,
    });
  }
  next();
}

export async function authenticate(req, res, next) {
  const status = getFirebaseAdminStatus();
  if (!status.configured) {
    return res.status(503).json({
      error: "Firebase Authentication is not configured on the server.",
      setup: status.error,
      configured: false,
    });
  }

  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please sign in." });
  }

  try {
    const decoded = await verifyIdToken(token);
    let user = db
      .prepare(
        `SELECT id, firebase_uid, name, email, role, is_verified, phone, preferences_json, created_at, updated_at
         FROM users WHERE firebase_uid = ?`,
      )
      .get(decoded.uid);

    if (!user && decoded.email) {
      user = db
        .prepare(
          `SELECT id, firebase_uid, name, email, role, is_verified, phone, preferences_json, created_at, updated_at
           FROM users WHERE email = ? COLLATE NOCASE`,
        )
        .get(decoded.email);
      if (user && !user.firebase_uid) {
        db.prepare("UPDATE users SET firebase_uid = ?, is_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
          decoded.uid,
          decoded.email_verified ? 1 : 0,
          user.id,
        );
        user.firebase_uid = decoded.uid;
      }
    }

    if (!user) {
      return res.status(401).json({
        error: "No LandAI profile found for this account. Please complete registration.",
        code: "PROFILE_MISSING",
      });
    }

    const emailVerified = Boolean(decoded.email_verified);
    if (user.is_verified !== (emailVerified ? 1 : 0)) {
      db.prepare("UPDATE users SET is_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(
        emailVerified ? 1 : 0,
        user.id,
      );
      user.is_verified = emailVerified ? 1 : 0;
    }

    req.firebaseUser = decoded;
    req.user = {
      id: user.id,
      firebase_uid: user.firebase_uid,
      name: user.name,
      email: user.email,
      role: user.role,
      is_verified: Boolean(user.is_verified),
      email_verified: emailVerified,
      phone: user.phone || "",
      preferences: safeJson(user.preferences_json, {}),
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
    next();
  } catch (err) {
    if (err?.code === "FIREBASE_NOT_CONFIGURED") {
      return res.status(503).json({
        error: "Firebase Authentication is not configured on the server.",
        setup: err.message,
        configured: false,
      });
    }
    return res.status(401).json({
      error: "Invalid or expired session. Please sign in again.",
    });
  }
}

export function requireVerifiedEmail(req, res, next) {
  if (!req.user?.email_verified) {
    return res.status(403).json({
      error: "Email verification required before accessing this resource.",
      code: "EMAIL_NOT_VERIFIED",
    });
  }
  next();
}

export function requireRole(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access forbidden: requires ${allowed.join(" or ")} privileges.`,
      });
    }
    next();
  };
}

function safeJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
