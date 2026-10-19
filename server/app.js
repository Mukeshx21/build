import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import propertyRouter from "./routes/properties.js";
import documentsRouter from "./routes/documents.js";
import { getFirebaseAdminStatus } from "./firebase.js";

const app = express();

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
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  const firebase = getFirebaseAdminStatus();
  res.json({
    status: "ok",
    service: "LandAI API",
    timestamp: new Date().toISOString(),
    firebase_admin: firebase.configured,
    firebase_message: firebase.configured
      ? "ready"
      : firebase.error,
  });
});

app.use("/api/auth", authRouter);
app.use("/api/documents", documentsRouter);
app.use("/api", propertyRouter);

app.use((err, _req, res, _next) => {
  console.error("Internal Server Error:", err?.message || err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
