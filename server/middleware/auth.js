import jwt from "jsonwebtoken";
import db from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "landai_super_secure_jwt_secret_key_2026_emerald";

export function getJwtSecret() {
  return JWT_SECRET;
}

export function authenticate(req, res, next) {
  let token = null;

  // 1. Check HTTP-only cookie
  if (req.cookies && req.cookies.landai_token) {
    token = req.cookies.landai_token;
  }

  // 2. Fallback to Authorization Header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Authentication required. Please sign in." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare("SELECT id, name, email, role, is_verified, created_at FROM users WHERE id = ?").get(decoded.id);

    if (!user) {
      res.clearCookie("landai_token");
      return res.status(401).json({ error: "User session expired or account not found." });
    }

    req.user = user;
    next();
  } catch (err) {
    res.clearCookie("landai_token");
    return res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Access forbidden: requires ${role} privileges.` });
    }
    next();
  };
}
