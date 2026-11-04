import { spawn } from "node:child_process";

export class OcrUpstreamError extends Error {
  constructor(message, status = 502, data = null) {
    super(message);
    this.name = "OcrUpstreamError";
    this.status = status;
    this.data = data;
  }
}

const isServerless = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Resolves the OCR API base URL dynamically:
 * 1. Explicitly configured OCR_API_URL or OCR_INTERNAL_URL environment variable.
 * 2. On Vercel: https://${VERCEL_URL} (invokes the Vercel Python Serverless Function api/ocr.py).
 * 3. Local development fallback: http://127.0.0.1:8000
 */
export function getOcrBaseUrl() {
  if (process.env.OCR_API_URL) {
    return process.env.OCR_API_URL.replace(/\/+$/, "");
  }
  if (process.env.OCR_INTERNAL_URL) {
    return process.env.OCR_INTERNAL_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_URL) {
    const raw = process.env.VERCEL_URL;
    const protocol = raw.startsWith("http") ? "" : "https://";
    return `${protocol}${raw}`.replace(/\/+$/, "");
  }
  return "http://127.0.0.1:8000";
}

let isSpawning = false;

async function checkHealth() {
  const base = getOcrBaseUrl();
  try {
    const res = await fetch(`${base}/api/ocr/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensureOcrRunning() {
  // Never attempt to spawn local desktop processes inside serverless environments
  if (isServerless) {
    return await checkHealth();
  }

  const isUp = await checkHealth();
  if (isUp) return true;
  if (isSpawning) {
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 400));
      if (await checkHealth()) return true;
    }
    return false;
  }

  isSpawning = true;
  try {
    const candidates = [
      process.env.PYTHON_CMD,
      "python",
      "python3",
      "python3.13",
      "C:\\Users\\mukes\\AppData\\Local\\Microsoft\\WindowsApps\\python3.exe",
      "C:\\Users\\mukes\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe",
    ].filter(Boolean);

    let spawned = false;
    for (const py of candidates) {
      try {
        const proc = spawn(
          py,
          ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--app-dir", "OCR"],
          {
            detached: true,
            stdio: "ignore",
            shell: process.platform === "win32",
          }
        );
        proc.unref();
        spawned = true;
        break;
      } catch {
        // try next candidate
      }
    }

    if (spawned) {
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 400));
        if (await checkHealth()) {
          console.log("[LandAI] OCR service auto-started and ready on port 8000");
          return true;
        }
      }
    }
  } catch (err) {
    console.error("[LandAI] Failed to auto-start OCR service:", err?.message || err);
  } finally {
    isSpawning = false;
  }

  return await checkHealth();
}

async function executeFetch(pathname, options = {}) {
  const { timeoutMs = 120000, headers = {}, ...rest } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const base = getOcrBaseUrl();

  // Normalize path
  const cleanPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const targetUrl = `${base}${cleanPath}`;

  try {
    const response = await fetch(targetUrl, {
      ...rest,
      headers,
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    let data = null;
    if (contentType.includes("application/json")) {
      data = await response.json().catch(() => null);
    } else if (options.asBuffer) {
      data = Buffer.from(await response.arrayBuffer());
    } else {
      data = await response.text().catch(() => null);
    }

    if (!response.ok) {
      const message =
        (data && typeof data === "object" && (data.detail || data.error)) ||
        (typeof data === "string" && data.slice(0, 200)) ||
        `OCR service returned HTTP ${response.status}`;
      throw new OcrUpstreamError(String(message), response.status, data);
    }

    return { data, response };
  } catch (err) {
    if (err instanceof OcrUpstreamError) throw err;
    if (err?.name === "AbortError") {
      throw new OcrUpstreamError("The OCR processing request timed out.", 504);
    }
    const errMsg = isServerless
      ? "The OCR service is temporarily unavailable. Please verify the Python OCR function is deployed or configure OCR_API_URL."
      : "The OCR service is currently unavailable. Ensure the Python OCR service is running.";
    throw new OcrUpstreamError(errMsg, 502);
  } finally {
    clearTimeout(timer);
  }
}

export async function ocrFetch(pathname, options = {}) {
  try {
    return await executeFetch(pathname, options);
  } catch (err) {
    if (!isServerless && err instanceof OcrUpstreamError && err.status === 502) {
      // In local development, try auto-starting if unreachable
      const running = await ensureOcrRunning();
      if (running) {
        return await executeFetch(pathname, options);
      }
    }
    throw err;
  }
}
