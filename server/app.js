import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import authRouter from "./routes/auth.js";
import propertyRouter from "./routes/properties.js";
import documentsRouter from "./routes/documents.js";
import { ensureOcrRunning } from "./services/ocrClient.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../public/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();

// Non-blocking warmup for OCR service on startup
ensureOcrRunning().catch(() => {});

function resolveAllowedOrigins() {
  const raw = process.env.CORS_ORIGINS || "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length) return list;
  if (process.env.NODE_ENV === "production") {
    return [];
  }
  return true; // reflect request origin in development
}

const corsOrigin = resolveAllowedOrigins();

app.use(
  cors({
    origin: corsOrigin.length === 0 && process.env.NODE_ENV === "production"
      ? false
      : corsOrigin,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "LandAI Unified Platform API",
    timestamp: new Date().toISOString(),
    auth: "JWT Native (Bcrypt + SQLite)",
    ocr_service_url: process.env.VITE_OCR_API_URL || "http://127.0.0.1:8000",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/documents", documentsRouter);
app.use("/api", propertyRouter);
// Seller-specific routes are mounted under /api/seller/* and /api/properties/*
// via the propertyRouter which handles both public and seller endpoints

app.use((err, _req, res, _next) => {
  console.error("Internal Server Error:", err?.message || err);
  res.status(500).json({ error: err?.message || "Internal server error" });
});

export default app;
