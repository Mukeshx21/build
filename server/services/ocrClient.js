import { spawn } from "node:child_process";

const OCR_BASE = (process.env.OCR_INTERNAL_URL || "http://127.0.0.1:8000").replace(
  /\/+$/,
  "",
);

export class OcrUpstreamError extends Error {
  constructor(message, status = 502, data = null) {
    super(message);
    this.name = "OcrUpstreamError";
    this.status = status;
    this.data = data;
  }
}

let isSpawning = false;

async function checkHealth() {
  try {
    const res = await fetch(`${OCR_BASE}/api/ocr/health`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensureOcrRunning() {
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

  try {
    const response = await fetch(`${OCR_BASE}${pathname}`, {
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
        `OCR service error (HTTP ${response.status})`;
      throw new OcrUpstreamError(String(message), response.status, data);
    }

    return { data, response };
  } catch (err) {
    if (err instanceof OcrUpstreamError) throw err;
    if (err?.name === "AbortError") {
      throw new OcrUpstreamError("OCR service timed out.", 504);
    }
    throw new OcrUpstreamError(
      "Unable to reach the OCR service. Ensure it is running on port 8000.",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function ocrFetch(pathname, options = {}) {
  try {
    return await executeFetch(pathname, options);
  } catch (err) {
    if (err instanceof OcrUpstreamError && err.status === 502) {
      // Attempt auto-start if OCR service is unreachable
      const running = await ensureOcrRunning();
      if (running) {
        return await executeFetch(pathname, options);
      }
    }
    throw err;
  }
}

export function getOcrBaseUrl() {
  return OCR_BASE;
}
