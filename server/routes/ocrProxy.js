import { Router } from "express";
import { getOcrBaseUrl } from "../services/ocrClient.js";

const router = Router();

router.use(async (req, res) => {
  const baseUrl = getOcrBaseUrl();
  const subPath = req.originalUrl || req.url;
  const targetUrl = new URL(subPath, baseUrl);

  try {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers["content-length"];

    const options = {
      method: req.method,
      headers,
    };

    if (["POST", "PUT", "PATCH"].includes(req.method.toUpperCase())) {
      if (req.body && Object.keys(req.body).length > 0) {
        options.body = JSON.stringify(req.body);
        options.headers["content-type"] = "application/json";
      }
    }

    const upstreamRes = await fetch(targetUrl.toString(), options);
    const contentType = upstreamRes.headers.get("content-type") || "";

    res.status(upstreamRes.status);
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    const bodyBuffer = Buffer.from(await upstreamRes.arrayBuffer());
    return res.send(bodyBuffer);
  } catch (err) {
    if (!res.headersSent) {
      const isServerless = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
      const msg = isServerless
        ? "Unable to reach the Python OCR service on Vercel. Please verify OCR_API_URL or serverless function deployment."
        : "Unable to reach the Python OCR service on port 8000. Ensure the Python OCR service is running.";
      return res.status(502).json({
        error: msg,
        detail: err.message,
      });
    }
  }
});

export default router;
