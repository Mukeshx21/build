import app from "../server/app.js";

/**
 * Vercel Serverless Function entrypoint for Express backend.
 * Handles API routes including authentication, properties, and document verification.
 */
export default async function handler(req, res) {
  try {
    // Normalize req.url in case Vercel stripped the /api prefix during rewrite
    if (req.url && !req.url.startsWith("/api") && !req.url.startsWith("/uploads")) {
      req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
    }
    return app(req, res);
  } catch (err) {
    console.error(`[Vercel Serverless Error] ${req.method} ${req.url}: ${err.name} - ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Serverless execution encountered an error. Please try again."
      });
    }
  }
}
