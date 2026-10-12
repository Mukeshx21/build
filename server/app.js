import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import propertyRouter from "./routes/properties.js";

const app = express();

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "LandAI Authentication & Property Engine",
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use("/api/auth", authRouter);
app.use("/api", propertyRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
