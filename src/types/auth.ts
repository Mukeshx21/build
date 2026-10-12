export type UserRole = "buyer" | "seller";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface AuthResponse {
  success?: boolean;
  message?: string;
  error?: string;
  user?: User;
  token?: string;
  email?: string;
}

export interface Inquiry {
  id: number;
  property_id: number;
  property_title: string;
  property_location?: string;
  buyer_id?: number;
  buyer_name: string;
  buyer_email: string;
  seller_id: number;
  visit_date?: string;
  visit_time?: string;
  message?: string;
  status: "Pending" | "Confirmed" | "Completed" | "Declined";
  created_at?: string;
}
