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

export async function ocrFetch(pathname, options = {}) {
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
      "Unable to reach the OCR service. Ensure it is running on the configured port.",
      502,
    );
  } finally {
    clearTimeout(timer);
  }
}

export function getOcrBaseUrl() {
  return OCR_BASE;
}
