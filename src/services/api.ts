import { AuthResponse, Inquiry, User } from "../types/auth"

export interface Property {
  id: number
  title: string
  location: string
  price: number
  area: number
  type: string
  score: number
  image: string
  verified: boolean
  tags: string[]
  seller_id?: number
  status?: string
}

export interface OcrPage {
  page_number: number
  text: string
  detected_language: string
  confidence: number | null
  status: string
  warnings: string[]
}

export interface OcrDocument {
  document_id: string
  original_name: string
  status: string
  page_count: number
  model_version?: string
  engine?: string
  pages: OcrPage[]
  fields?: Record<string, { value: string | null; status: string }>;
}

export class ApiError extends Error {
  status: number
  data: any

  constructor(message: string, status = 0, data: any = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

// Configurable API URLs via environment variables with intelligent fallbacks
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(
  /\/+$/,
  "",
)
const OCR_BASE_URL = (import.meta.env.VITE_OCR_API_URL || "").replace(
  /\/+$/,
  "",
)

/**
 * Normalizes error messages so the user gets actionable explanations rather
 * than raw technical exceptions or generic "Failed to fetch" text.
 */
export function formatErrorMessage(
  err: unknown,
  fallbackMessage = "An unexpected error occurred.",
): string {
  if (err instanceof ApiError) {
    return err.message
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network request failed")
    ) {
      return "Unable to connect to the backend server. Please verify the application backend is running."
    }
    if (msg.includes("abort") || msg.includes("timeout")) {
      return "The request timed out. The server took too long to process your request."
    }
    return err.message
  }

  return fallbackMessage
}

/**
 * Centralized HTTP request utility with token injection, timeout handling, and
 * consistent error formatting.
 */
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number; isOcr?: boolean } = {},
): Promise<T> {
  const {
    timeoutMs = 25000,
    isOcr = false,
    headers: customHeaders,
    ...fetchOptions
  } = options

  // Determine correct base URL
  let fullUrl: string
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    fullUrl = endpoint
  } else {
    const base = isOcr ? OCR_BASE_URL : API_BASE_URL
    fullUrl = `${base}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
  }

  // Setup headers
  const headers = new Headers(customHeaders)

  // Auto-inject JWT token if available
  const token = localStorage.getItem("landai_token")
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  // Auto-set JSON content-type unless sending FormData
  if (
    !(fetchOptions.body instanceof FormData) &&
    !headers.has("Content-Type") &&
    fetchOptions.body
  ) {
    headers.set("Content-Type", "application/json")
  }

  // Setup timeout with AbortController
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
      credentials: "include",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Parse JSON or text safely
    let responseData: any = null
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      try {
        responseData = await response.json()
      } catch {
        responseData = null
      }
    } else {
      responseData = await response.text().catch(() => null)
    }

    if (!response.ok) {
      let errorMsg = `Server error (HTTP ${response.status})`
      if (responseData && typeof responseData === "object") {
        errorMsg =
          responseData.error ||
          responseData.detail ||
          responseData.message ||
          errorMsg
      } else if (
        typeof responseData === "string" &&
        responseData.length < 200
      ) {
        errorMsg = responseData
      }

      if (response.status === 401) {
        // Clear expired or invalidated session token
        localStorage.removeItem("landai_token")
        errorMsg = "Your session has expired. Please sign in again."
      } else if (response.status === 403) {
        errorMsg = "You do not have permission to perform this action."
      } else if (response.status === 404) {
        errorMsg = "The requested resource could not be found."
      } else if (response.status >= 500) {
        errorMsg =
          responseData?.error ||
          "The server encountered an error processing your request."
      }

      throw new ApiError(errorMsg, response.status, responseData)
    }

    return responseData as T
  } catch (err: unknown) {
    clearTimeout(timeoutId)

    if (err instanceof ApiError) {
      throw err
    }

    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(
        `Request timed out after ${timeoutMs / 1000} seconds. Please try again.`,
        408,
      )
    }

    const readableMessage = formatErrorMessage(err)
    throw new ApiError(readableMessage, 0, err)
  }
}

// ----------------------------------------------------------------------
// Centralized API Domain Services
// ----------------------------------------------------------------------

export const api = {
  // Authentication & Session
  auth: {
    async getMe(): Promise<{ user: User | null }> {
      return apiRequest<{ user: User }>("/api/auth/me", { method: "GET" })
    },

    async login(credentials: {
      email: string
      password: string
      rememberMe?: boolean
    }): Promise<AuthResponse> {
      const res = await apiRequest<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      })
      if (res.token) {
        localStorage.setItem("landai_token", res.token)
      }
      return res
    },

    async register(data: {
      name: string
      email: string
      password: string
      confirmPassword: string
      role: string
      agreeTerms: boolean
    }): Promise<AuthResponse> {
      const res = await apiRequest<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      })
      if (res.token) {
        localStorage.setItem("landai_token", res.token)
      }
      return res
    },

    async logout(): Promise<void> {
      try {
        await apiRequest("/api/auth/logout", { method: "POST" })
      } finally {
        localStorage.removeItem("landai_token")
      }
    },

    async resetPassword(data: {
      email: string
      newPassword: string
      confirmPassword: string
    }): Promise<{ success: boolean; message: string }> {
      return apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(data),
      })
    },
  },

  // Properties & Marketplace
  properties: {
    async getAll(): Promise<{ properties: Property[] }> {
      return apiRequest<{ properties: Property[] }>("/api/properties", {
        method: "GET",
      })
    },

    async create(propertyData: {
      title: string
      location: string
      price: number
      area: number
      type: string
      image?: string
      tags?: string[]
    }): Promise<{ success: boolean; message: string; property: Property }> {
      return apiRequest("/api/properties", {
        method: "POST",
        body: JSON.stringify(propertyData),
      })
    },

    async delete(id: number): Promise<{ success: boolean; message: string }> {
      return apiRequest(`/api/properties/${id}`, { method: "DELETE" })
    },
  },

  // Inquiries & Site Visits
  inquiries: {
    async getAll(): Promise<{ inquiries: Inquiry[] }> {
      return apiRequest<{ inquiries: Inquiry[] }>("/api/inquiries", {
        method: "GET",
      })
    },

    async create(inquiryData: {
      property_id: number
      visit_date?: string
      visit_time?: string
      message?: string
    }): Promise<{ success: boolean; message: string; inquiryId: number }> {
      return apiRequest("/api/inquiries", {
        method: "POST",
        body: JSON.stringify(inquiryData),
      })
    },

    async updateStatus(id: number, status: string): Promise<{
      success: boolean
      message: string
    }> {
      return apiRequest(`/api/inquiries/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
    },
  },

  // Document AI & OCR Model
  ocr: {
    getExportUrl(
      documentId: string,
      format: "txt" | "docx" | "pdf" | "json",
    ): string {
      const base = OCR_BASE_URL || ""
      return `${base}/api/ocr/document/${documentId}/export/${format}`
    },

    async checkHealth(): Promise<{
      status: string
      service: string
      model_version?: string
    }> {
      return apiRequest("/api/ocr/health", {
        method: "GET",
        isOcr: true,
        timeoutMs: 5000,
      })
    },

    async upload(file: File, language = "ta-en"): Promise<{
      document_id: string
      filename: string
      size: number
    }> {
      const form = new FormData()
      form.append("file", file)
      form.append("language", language)

      return apiRequest("/api/ocr/upload", {
        method: "POST",
        body: form,
        isOcr: true,
        timeoutMs: 60000,
      })
    },

    async process(documentId: string): Promise<any> {
      return apiRequest("/api/ocr/process", {
        method: "POST",
        body: JSON.stringify({ document_id: documentId }),
        isOcr: true,
        timeoutMs: 90000,
      })
    },

    async uploadAndProcess(
      file: File,
      language = "ta-en",
    ): Promise<OcrDocument> {
      const uploaded = await this.upload(file, language)
      const processed = await this.process(uploaded.document_id)

      return {
        ...processed,
        document_id: uploaded.document_id,
        engine: processed.processing?.engine || "tesseract",
        model_version:
          processed.processing?.model_version || "tesseract-default",
      }
    },

    async saveCorrections(
      documentId: string,
      pages: Record<string, string>,
    ): Promise<any> {
      return apiRequest(`/api/ocr/document/${documentId}/corrections`, {
        method: "PUT",
        body: JSON.stringify({ pages }),
        isOcr: true,
        timeoutMs: 30000,
      })
    },
  },

  // System Diagnostics
  system: {
    async checkHealth(): Promise<{
      status: string
      service: string
      timestamp: string
    }> {
      return apiRequest("/api/health", { method: "GET", timeoutMs: 5000 })
    },
  },
}

export default api
