import { AuthResponse, Inquiry, User, UserPreferences } from "../types/auth"
import { getFirebaseAuth } from "../lib/firebase"

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
  description?: string
  sample_label?: string
  is_sample?: boolean
  saved?: boolean
  recommendation_reasons?: string[]
}

export interface OcrPage {
  page_number: number
  text: string
  detected_language: string
  confidence: number | null
  status: string
  warnings: string[]
}

export interface OcrField {
  value: string | null
  status: string
  source?: string
}

export interface OcrDocument {
  document_id: string
  local_id?: number
  original_name: string
  status: string
  page_count: number
  model_version?: string
  engine?: string
  pages: OcrPage[]
  fields?: Record<string, OcrField>
  warning?: string
}

export interface ValidationResult {
  validation_id?: number
  local_id?: number
  document_id?: string
  original_name?: string
  overall_status: string
  checks: Array<{
    id: string
    category: string
    severity: string
    title: string
    detail: string
    evidence?: unknown
  }>
  disclaimer: string
  summary?: {
    total: number
    pass: number
    warning: number
    fail: number
    info: number
  }
  official_verification_performed: boolean
  state_rules?: string
}

export class ApiError extends Error {
  status: number
  data: unknown

  constructor(message: string, status = 0, data: unknown = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "")

export function formatErrorMessage(
  err: unknown,
  fallbackMessage = "An unexpected error occurred.",
): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network request failed")
    ) {
      return "Unable to connect to the backend server. Please verify the LandAI API is running."
    }
    if (msg.includes("abort") || msg.includes("timeout")) {
      return "The request timed out. The server took too long to process your request."
    }
    return err.message
  }
  return fallbackMessage
}

async function getIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuth()
  if (!auth?.currentUser) return null
  try {
    return await auth.currentUser.getIdToken(forceRefresh)
  } catch {
    return null
  }
}

async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number; skipAuth?: boolean } = {},
): Promise<T> {
  const {
    timeoutMs = 25000,
    skipAuth = false,
    headers: customHeaders,
    ...fetchOptions
  } = options

  let fullUrl: string
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    fullUrl = endpoint
  } else {
    fullUrl = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`
  }

  const headers = new Headers(customHeaders)
  if (!skipAuth) {
    const token = await getIdToken()
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`)
    }
  }

  if (
    !(fetchOptions.body instanceof FormData) &&
    !headers.has("Content-Type") &&
    fetchOptions.body
  ) {
    headers.set("Content-Type", "application/json")
  }

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

    let responseData: unknown = null
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      responseData = await response.json().catch(() => null)
    } else {
      responseData = await response.text().catch(() => null)
    }

    if (!response.ok) {
      const dataObj =
        responseData && typeof responseData === "object"
          ? (responseData as Record<string, unknown>)
          : null
      let errorMsg = `Server error (HTTP ${response.status})`
      if (dataObj) {
        errorMsg = String(
          dataObj.error || dataObj.detail || dataObj.message || errorMsg,
        )
      } else if (
        typeof responseData === "string" &&
        responseData.length < 200
      ) {
        errorMsg = responseData
      }

      if (response.status === 401) {
        errorMsg = "Your session has expired. Please sign in again."
      } else if (response.status === 403) {
        errorMsg =
          String(dataObj?.error || "") ||
          "You do not have permission to perform this action."
      }

      throw new ApiError(errorMsg, response.status, responseData)
    }

    return responseData as T
  } catch (err: unknown) {
    clearTimeout(timeoutId)
    if (err instanceof ApiError) throw err
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(
        `Request timed out after ${timeoutMs / 1000} seconds. Please try again.`,
        408,
      )
    }
    throw new ApiError(formatErrorMessage(err), 0, err)
  }
}

export const api = {
  auth: {
    async status(): Promise<{ configured: boolean; message: string }> {
      return apiRequest("/api/auth/status", { method: "GET", skipAuth: true })
    },

    async register(data: {
      idToken: string
      name: string
      role: string
      agreeTerms: boolean
    }): Promise<AuthResponse> {
      return apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
        skipAuth: true,
      })
    },

    async session(idToken: string): Promise<AuthResponse> {
      return apiRequest("/api/auth/session", {
        method: "POST",
        body: JSON.stringify({ idToken }),
        skipAuth: true,
      })
    },

    async getMe(): Promise<{ user: User }> {
      return apiRequest("/api/auth/me", { method: "GET" })
    },

    async updateProfile(data: {
      name?: string
      phone?: string
      preferences?: UserPreferences
    }): Promise<AuthResponse> {
      return apiRequest("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      })
    },

    async logout(): Promise<void> {
      await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => null)
    },
  },

  properties: {
    async search(params: Record<string, string | number | undefined> = {}) {
      const qs = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== "") qs.set(k, String(v))
      })
      const query = qs.toString()
      return apiRequest<{
        properties: Property[]
        pagination: {
          page: number
          pageSize: number
          total: number
          totalPages: number
        }
        data_note?: string
      }>(`/api/properties${query ? `?${query}` : ""}`, { method: "GET" })
    },

    async get(id: number) {
      return apiRequest<{ property: Property }>(`/api/properties/${id}`, {
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
      description?: string
    }) {
      return apiRequest<{
        success: boolean
        message: string
        property: Property
      }>("/api/properties", {
        method: "POST",
        body: JSON.stringify(propertyData),
      })
    },

    async delete(id: number) {
      return apiRequest<{ success: boolean; message: string }>(
        `/api/properties/${id}`,
        { method: "DELETE" },
      )
    },

    async getSaved() {
      return apiRequest<{ properties: Property[] }>("/api/saved", {
        method: "GET",
      })
    },

    async save(id: number) {
      return apiRequest(`/api/saved/${id}`, { method: "POST" })
    },

    async unsave(id: number) {
      return apiRequest(`/api/saved/${id}`, { method: "DELETE" })
    },
  },

  inquiries: {
    async getAll() {
      return apiRequest<{ inquiries: Inquiry[] }>("/api/inquiries", {
        method: "GET",
      })
    },
    async create(inquiryData: {
      property_id: number
      visit_date?: string
      visit_time?: string
      message?: string
    }) {
      return apiRequest("/api/inquiries", {
        method: "POST",
        body: JSON.stringify(inquiryData),
      })
    },
    async updateStatus(id: number, status: string) {
      return apiRequest(`/api/inquiries/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
    },
  },

  documents: {
    async list() {
      return apiRequest<{ documents: Array<Record<string, unknown>> }>(
        "/api/documents",
        { method: "GET" },
      )
    },

    async history() {
      return apiRequest<{ history: Array<Record<string, unknown>> }>(
        "/api/documents/history",
        { method: "GET" },
      )
    },

    async checkOcrHealth() {
      return apiRequest("/api/documents/health/ocr", {
        method: "GET",
        timeoutMs: 5000,
      })
    },

    async upload(file: File, language = "ta-en") {
      const form = new FormData()
      form.append("file", file)
      form.append("language", language)
      return apiRequest<{
        document_id: string
        local_id: number
        filename: string
        size: number
        status: string
      }>("/api/documents/upload", {
        method: "POST",
        body: form,
        timeoutMs: 60000,
      })
    },

    async process(documentId: string) {
      return apiRequest<OcrDocument>("/api/documents/process", {
        method: "POST",
        body: JSON.stringify({ document_id: documentId }),
        timeoutMs: 180000,
      })
    },

    async uploadAndProcess(file: File, language = "ta-en") {
      const uploaded = await this.upload(file, language)
      const processed = await this.process(uploaded.document_id)
      return {
        ...processed,
        document_id: uploaded.document_id,
        local_id: uploaded.local_id,
        engine: "tesseract",
      } as OcrDocument
    },

    async get(id: string | number) {
      return apiRequest<OcrDocument>(`/api/documents/${id}`, { method: "GET" })
    },

    async saveCorrections(id: string | number, pages: Record<string, string>) {
      return apiRequest(`/api/documents/${id}/corrections`, {
        method: "PUT",
        body: JSON.stringify({ pages }),
      })
    },

    async approveFields(
      id: string | number,
      approved_fields: Record<string, unknown>,
    ) {
      return apiRequest(`/api/documents/${id}/fields`, {
        method: "PUT",
        body: JSON.stringify({ approved_fields }),
      })
    },

    async validate(id: string | number) {
      return apiRequest<ValidationResult>(`/api/documents/${id}/validate`, {
        method: "POST",
        timeoutMs: 60000,
      })
    },

    getExportUrl(id: string | number, format: "txt" | "json" | "pdf" | "docx") {
      return `${API_BASE_URL}/api/documents/${id}/export/${format}`
    },

    getValidationReportUrl(id: string | number) {
      return `${API_BASE_URL}/api/documents/${id}/validation/report`
    },

    async downloadExport(
      id: string | number,
      format: "txt" | "json" | "pdf" | "docx",
    ) {
      const token = await getIdToken()
      const response = await fetch(this.getExportUrl(id, format), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      })
      if (!response.ok) {
        throw new ApiError("Export failed.", response.status)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `landai-export.${format}`
      a.click()
      URL.revokeObjectURL(url)
    },
  },

  system: {
    async checkHealth() {
      return apiRequest<{
        status: string
        service: string
        timestamp: string
        firebase_admin?: boolean
        firebase_message?: string
      }>("/api/health", { method: "GET", timeoutMs: 5000, skipAuth: true })
    },
  },
}

export default api
