import { NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  Bookmark,
  Building2,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react"
import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { Badge } from "./ui"

export default function AppShell() {
  const { user, logout, requiresEmailVerification } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  if (!user) return null

  const buyerLinks = [
    { to: "/app", end: true, label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/documents", label: "OCR Workspace", icon: UploadCloud },
    { to: "/app/history", label: "History", icon: History },
    { to: "/app/discover", label: "Find Property", icon: Search },
    { to: "/app/saved", label: "Saved", icon: Bookmark },
    { to: "/app/profile", label: "Profile", icon: Settings },
  ]

  const sellerLinks = [
    { to: "/app", end: true, label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/documents", label: "OCR Workspace", icon: UploadCloud },
    { to: "/app/history", label: "History", icon: History },
    { to: "/app/seller", label: "My Listings", icon: Building2 },
    { to: "/app/discover", label: "Marketplace", icon: Search },
    { to: "/app/profile", label: "Profile", icon: Settings },
  ]

  const links = user.role === "seller" ? sellerLinks : buyerLinks

  return (
    <div className="app-shell">
      {open ? (
        <button
          className="menu-scrim"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <span>
            <ShieldCheck size={20} />
          </span>
          <div>
            <strong>LandAI</strong>
            <small>Land records & discovery</small>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>
        <nav>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-card">
          <FileText size={18} />
          <strong>Tamil + English OCR</strong>
          <p>
            Upload patta, EC, or survey scans. Review extracted fields before you
            approve anything.
          </p>
        </div>
        <div className="side-footer">
          <button
            type="button"
            onClick={async () => {
              await logout()
              navigate("/login")
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div>
            <p className="eyebrow">LandAI workspace</p>
            <h1>
              {user.role === "seller" ? "Seller console" : "Buyer console"}
            </h1>
          </div>
          <div className="header-actions">
            {requiresEmailVerification ? (
              <Badge tone="amber">Email unverified</Badge>
            ) : (
              <Badge tone="green">
                <ShieldCheck size={12} /> Verified
              </Badge>
            )}
            <div className="profile" aria-label="Signed-in user">
              <span>
                <UserRound size={16} />
              </span>
              <div>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
            </div>
          </div>
        </header>
        <div className="page-wrap">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
