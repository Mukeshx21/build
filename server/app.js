import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import authRouter from "./routes/auth.js";
import propertyRouter from "./routes/properties.js";
import documentsRouter from "./routes/documents.js";
import ocrProxyRouter from "./routes/ocrProxy.js";
import { ensureOcrRunning } from "./services/ocrClient.js";

import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isServerless = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const defaultUploadsDir = path.resolve(__dirname, "../public/uploads");
const uploadsDir = isServerless ? path.join(os.tmpdir(), "landai-uploads") : defaultUploadsDir;

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  console.warn("[Uploads] Could not create uploadsDir:", err.message);
}

const app = express();

// Non-blocking warmup for OCR service on startup
ensureOcrRunning().catch(() => {});

function resolveCorsOrigin(origin, callback) {
  // Allow requests without Origin (e.g. mobile apps, curl, server-to-server)
  if (!origin) return callback(null, true);

  const raw = process.env.CORS_ORIGINS || "";
  const allowedList = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowedList.includes(origin)) {
    return callback(null, true);
  }

  // Allow vercel preview / production deployments and localhost
  if (
    /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
    /^https?:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)
  ) {
    return callback(null, true);
  }

  // If in development or no specific whitelist configured, reflect origin
  if (process.env.NODE_ENV !== "production" || allowedList.length === 0) {
    return callback(null, true);
  }

  return callback(new Error("CORS origin not allowed: " + origin));
}

app.use(
  cors({
    origin: resolveCorsOrigin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use("/uploads", express.static(uploadsDir));
if (fs.existsSync(defaultUploadsDir)) {
  app.use("/uploads", express.static(defaultUploadsDir));
}

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "LandAI Unified Platform API",
    timestamp: new Date().toISOString(),
    auth: "JWT Native (Bcrypt + SQLite)",
    ocr_service_url: process.env.VITE_OCR_API_URL || "http://127.0.0.1:8000",
  });
});

// Health check endpoints
app.get(["/api/health", "/health"], (_req, res) => {
  res.json({
    status: "ok",
    service: "Terra / LandAI Unified Platform API",
    timestamp: new Date().toISOString(),
    auth: "JWT Native (Bcrypt + SQLite)",
    ocr_service_url: process.env.VITE_OCR_API_URL || "http://127.0.0.1:8000",
  });
});

// Mount routes with and without /api prefix for Vercel serverless rewrite compatibility
app.use("/api/auth", authRouter);
app.use("/auth", authRouter);
app.use("/api/documents", documentsRouter);
app.use("/documents", documentsRouter);
app.use("/api/ocr", ocrProxyRouter);
app.use("/ocr", ocrProxyRouter);
app.use("/api", propertyRouter);
app.use("/", propertyRouter);
// Seller-specific routes are mounted under /api/seller/* and /api/properties/*
// via the propertyRouter which handles both public and seller endpoints

app.use((err, _req, res, _next) => {
  console.error("Internal Server Error:", err?.message || err);
  res.status(500).json({ error: err?.message || "Internal server error" });
});

export default app;
