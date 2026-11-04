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
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        error: "Invalid session token. Please sign in again.",
        code: "INVALID_TOKEN",
      });
    }

    const user = db
      .prepare(
        `SELECT id, name, email, role, phone, preferences_json, created_at, updated_at
         FROM users WHERE id = ?`,
      )
      .get(decoded.id);

    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({
        error: "No LandAI profile found for this account. Please complete registration.",
        code: "PROFILE_MISSING",
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || "",
      preferences: safeJson(user.preferences_json, {}),
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

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
    if (!decoded || !decoded.id) {
      req.user = null;
      return next();
    }

    const user = db
      .prepare(
        `SELECT id, name, email, role, phone, preferences_json, created_at, updated_at
         FROM users WHERE id = ?`,
      )
      .get(decoded.id);

    if (user) {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        preferences: safeJson(user.preferences_json, {}),
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
    } else {
      req.user = null;
    }
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
