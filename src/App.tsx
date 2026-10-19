import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import AppShell from "./components/AppShell"
import ProtectedRoute from "./components/ProtectedRoute"
import LandingPage from "./pages/LandingPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import VerifyEmailPage from "./pages/VerifyEmailPage"
import NotFoundPage from "./pages/NotFoundPage"
import DashboardPage from "./pages/DashboardPage"
import DocumentsPage from "./pages/DocumentsPage"
import DiscoverPage from "./pages/DiscoverPage"
import SavedPage from "./pages/SavedPage"
import HistoryPage from "./pages/HistoryPage"
import ProfilePage from "./pages/ProfilePage"
import SellerPage from "./pages/SellerPage"

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute requireVerified={false}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route
              path="documents"
              element={
                <ProtectedRoute>
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="discover"
              element={
                <ProtectedRoute>
                  <DiscoverPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="saved"
              element={
                <ProtectedRoute>
                  <SavedPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute requireVerified={false}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="seller"
              element={
                <ProtectedRoute roles={["seller"]}>
                  <SellerPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
