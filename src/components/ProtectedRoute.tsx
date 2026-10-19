import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import type { UserRole } from "../types/auth"
import { Skeleton } from "./ui"

export default function ProtectedRoute({
  children,
  roles,
  requireVerified = true,
}: {
  children: React.ReactNode
  roles?: UserRole[]
  requireVerified?: boolean
}) {
  const { user, firebaseUser, loading, requiresEmailVerification } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="page-wrap">
        <Skeleton className="skel-card" />
      </div>
    )
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!user) {
    return <Navigate to="/register" replace />
  }

  if (requireVerified && requiresEmailVerification) {
    return <Navigate to="/verify-email" replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/app" replace />
  }

  return children
}
