import jwt from "jsonwebtoken";
import db from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "landai_default_development_secret_key_2026";
const TOKEN_EXPIRY = "7d";
const COOKIE_NAME = "landai_token";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
}

export function clearAuthCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });
}

function extractToken(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    const candidate = authHeader.slice(7).trim();
    if (candidate) return candidate;
  }
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  return null;
}

/**
 * Robust identity and profile resolver.
 * Handles primary key lookup, email fallback, cross-container session recovery,
 * and automatic synchronization with the user_profiles table.
 */
function resolveUserAndProfile(decoded) {
  if (!decoded || (!decoded.id && !decoded.userId && !decoded.sub && !decoded.email)) {
    return null;
  }

  const rawId = decoded.id ?? decoded.userId ?? decoded.sub;
  const candidateId = Number(rawId);
  const candidateEmail = typeof decoded.email === "string" ? decoded.email.trim().toLowerCase() : null;

  let user = null;
  if (candidateEmail) {
    user = db
      .prepare(
        `SELECT id, name, email, role, phone, preferences_json, account_status, created_at, updated_at
         FROM users WHERE LOWER(email) = LOWER(?)`,
      )
      .get(candidateEmail);
  }

  if (!user && !Number.isNaN(candidateId) && Number.isInteger(candidateId) && candidateId > 0) {
    user = db
      .prepare(
        `SELECT id, name, email, role, phone, preferences_json, account_status, created_at, updated_at
         FROM users WHERE id = ?`,
      )
      .get(candidateId);
  }

  // Auto-repair / fallback mechanism:
  // If the token is cryptographically verified but the row does not exist in the active
  // database instance (e.g. fresh serverless container or ephemeral /tmp SQLite),
  // safely restore the user account and linked LandAI profile so OCR and features work seamlessly.
  if (!user && (candidateEmail || (!Number.isNaN(candidateId) && candidateId > 0))) {
    const safeEmail = candidateEmail || `user_${candidateId}@landai.local`;
    const safeName = decoded.name || decoded.display_name || safeEmail.split("@")[0] || "LandAI User";
    const rawRole = (decoded.role && typeof decoded.role === "string") ? decoded.role.toLowerCase() : "buyer";
    const dbRole = (rawRole === "seller" || rawRole === "agent") ? "seller" : "buyer";

    try {
      const existingWithId = (!Number.isNaN(candidateId) && candidateId > 0)
        ? db.prepare("SELECT email FROM users WHERE id = ?").get(candidateId)
        : null;

      if (!existingWithId && !Number.isNaN(candidateId) && candidateId > 0) {
        db.prepare(`
          INSERT OR IGNORE INTO users (id, name, email, password_hash, role, email_verified, account_status)
          VALUES (?, ?, ?, 'restored_session_hash', ?, 1, 'active')
        `).run(candidateId, safeName, safeEmail, dbRole);
      } else {
        db.prepare(`
          INSERT OR IGNORE INTO users (name, email, password_hash, role, email_verified, account_status)
          VALUES (?, ?, 'restored_session_hash', ?, 1, 'active')
        `).run(safeName, safeEmail, dbRole);
      }
    } catch (insertErr) {
      console.warn("[Auth] Session recovery insert notice:", insertErr.message);
    }

    user = db
      .prepare(
        `SELECT id, name, email, role, phone, preferences_json, account_status, created_at, updated_at
         FROM users WHERE LOWER(email) = LOWER(?)`,
      )
      .get(safeEmail);
  }

  if (!user) {
    return null;
  }

  // Ensure linked LandAI user profile exists
  let profile = null;
  try {
    profile = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(user.id);
    if (!profile) {
      db.prepare(`
        INSERT OR REPLACE INTO user_profiles (user_id, display_name, email, role, phone, preferences_json, ocr_access, status)
        VALUES (?, ?, ?, ?, ?, ?, 1, 'active')
      `).run(user.id, user.name, user.email, user.role, user.phone || "", user.preferences_json || "{}");
      profile = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(user.id);
    }
  } catch (profErr) {
    console.warn("[Auth] Profile auto-repair notice:", profErr.message);
  }

  return {
    id: user.id,
    user_id: user.id,
    name: user.name,
    display_name: profile?.display_name || user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || "",
    preferences: safeJson(user.preferences_json, {}),
    profile: profile || {
      id: user.id,
      user_id: user.id,
      display_name: user.name,
      email: user.email,
      role: user.role,
      ocr_access: 1,
      status: "active",
    },
    ocr_access: profile?.ocr_access ?? 1,
    status: profile?.status || user.account_status || "active",
    has_profile: true,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

export function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: "Authentication required. Please sign in.",
      code: "AUTH_REQUIRED",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const resolvedUser = resolveUserAndProfile(decoded);

    if (!resolvedUser) {
      clearAuthCookie(res);
      return res.status(401).json({
        error: "No LandAI profile found for this account. Please complete registration.",
        code: "PROFILE_MISSING",
      });
    }

    req.user = resolvedUser;
    next();
  } catch (err) {
    clearAuthCookie(res);
    return res.status(401).json({
      error: "Session expired or invalid. Please sign in again.",
      code: "SESSION_EXPIRED",
    });
  }
}

export function optionalAuthenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = resolveUserAndProfile(decoded);
  } catch {
    req.user = null;
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
