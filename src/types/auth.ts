export type UserRole = "buyer" | "seller"

export interface UserPreferences {
  location?: string
  type?: string
  maxBudget?: number
  minArea?: number
}

export interface User {
  id: number
  firebase_uid?: string
  name: string
  email: string
  role: UserRole
  is_verified?: boolean
  email_verified?: boolean
  phone?: string
  preferences?: UserPreferences
  created_at?: string
  updated_at?: string
}

export interface AuthResponse {
  success?: boolean
  message?: string
  error?: string
  user?: User
  requiresEmailVerification?: boolean
  code?: string
  configured?: boolean
}

export interface Inquiry {
  id: number
  property_id: number
  property_title: string
  property_location?: string
  buyer_id?: number
  buyer_name: string
  buyer_email: string
  seller_id: number
  visit_date?: string
  visit_time?: string
  message?: string
  status: "Pending" | "Confirmed" | "Completed" | "Declined"
  created_at?: string
}
