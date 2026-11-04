import app from "../server/app.js";

/**
 * Vercel Serverless Function entrypoint for Express backend.
 * Handles API routes including authentication, properties, and document verification.
 */
export default function handler(req, res) {
  // Normalize req.url in case Vercel stripped the /api prefix during rewrite
  if (req.url && !req.url.startsWith("/api") && !req.url.startsWith("/uploads")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  return app(req, res);
}
