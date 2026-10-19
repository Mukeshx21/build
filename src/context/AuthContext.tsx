import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth"
import { User, UserRole } from "../types/auth"
import { api, formatErrorMessage } from "../services/api"
import {
  getFirebaseAuth,
  getFirebaseClientStatus,
  type FirebaseClientStatus,
} from "../lib/firebase"

type AuthContextValue = {
  user: User | null
  firebaseUser: FirebaseUser | null
  loading: boolean
  firebaseStatus: FirebaseClientStatus
  serverFirebaseReady: boolean | null
  requiresEmailVerification: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    name: string
    email: string
    password: string
    role: UserRole
    agreeTerms: boolean
  }) => Promise<{ requiresEmailVerification: boolean }>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  resendVerification: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateProfile: (data: {
    name?: string
    phone?: string
    preferences?: User["preferences"]
  }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapFirebaseError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : ""
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please sign in."
    case "auth/invalid-email":
      return "Please enter a valid email address."
    case "auth/weak-password":
      return "Password must be at least 6 characters."
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password."
    case "auth/too-many-requests":
      return "Too many attempts. Please wait and try again."
    default:
      return formatErrorMessage(err, "Authentication failed.")
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const firebaseStatus = getFirebaseClientStatus()
  const [user, setUser] = useState<User | null>(null)
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [serverFirebaseReady, setServerFirebaseReady] = useState<boolean | null>(
    null,
  )
  const [requiresEmailVerification, setRequiresEmailVerification] =
    useState(false)

  useEffect(() => {
    api.auth
      .status()
      .then((s) => setServerFirebaseReady(s.configured))
      .catch(() => setServerFirebaseReady(false))
  }, [])

  const syncProfile = useCallback(async (fbUser: FirebaseUser) => {
    const idToken = await fbUser.getIdToken()
    try {
      const session = await api.auth.session(idToken)
      if (session.user) {
        setUser(session.user)
        setRequiresEmailVerification(Boolean(session.requiresEmailVerification))
        return
      }
    } catch (err) {
      const apiErr = err as { status?: number; data?: { code?: string } }
      if (apiErr.status === 404 || apiErr.data?.code === "PROFILE_MISSING") {
        setUser(null)
        setRequiresEmailVerification(!fbUser.emailVerified)
        return
      }
      throw err
    }
  }, [])

  useEffect(() => {
    const auth = getFirebaseAuth()
    if (!auth) {
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (!fbUser) {
        setUser(null)
        setRequiresEmailVerification(false)
        setLoading(false)
        return
      }
      try {
        await syncProfile(fbUser)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [syncProfile])

  const login = useCallback(async (email: string, password: string) => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error(getFirebaseClientStatus().message)
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await syncProfile(cred.user)
      setRequiresEmailVerification(!cred.user.emailVerified)
    } catch (err) {
      throw new Error(mapFirebaseError(err))
    }
  }, [syncProfile])

  const register = useCallback(
    async (input: {
      name: string
      email: string
      password: string
      role: UserRole
      agreeTerms: boolean
    }) => {
      const auth = getFirebaseAuth()
      if (!auth) throw new Error(getFirebaseClientStatus().message)
      try {
        const cred = await createUserWithEmailAndPassword(
          auth,
          input.email.trim(),
          input.password,
        )
        await sendEmailVerification(cred.user)
        const idToken = await cred.user.getIdToken()
        const result = await api.auth.register({
          idToken,
          name: input.name.trim(),
          role: input.role,
          agreeTerms: input.agreeTerms,
        })
        if (result.user) setUser(result.user)
        const needsVerify = Boolean(
          result.requiresEmailVerification || !cred.user.emailVerified,
        )
        setRequiresEmailVerification(needsVerify)
        return { requiresEmailVerification: needsVerify }
      } catch (err) {
        throw new Error(mapFirebaseError(err))
      }
    },
    [],
  )

  const logout = useCallback(async () => {
    const auth = getFirebaseAuth()
    await api.auth.logout().catch(() => null)
    if (auth) await signOut(auth)
    setUser(null)
    setFirebaseUser(null)
    setRequiresEmailVerification(false)
  }, [])

  const refreshProfile = useCallback(async () => {
    const auth = getFirebaseAuth()
    if (!auth?.currentUser) return
    await auth.currentUser.reload()
    await auth.currentUser.getIdToken(true)
    await syncProfile(auth.currentUser)
    setRequiresEmailVerification(!auth.currentUser.emailVerified)
  }, [syncProfile])

  const resendVerification = useCallback(async () => {
    const auth = getFirebaseAuth()
    if (!auth?.currentUser) throw new Error("Please sign in first.")
    await sendEmailVerification(auth.currentUser)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const auth = getFirebaseAuth()
    if (!auth) throw new Error(getFirebaseClientStatus().message)
    try {
      await sendPasswordResetEmail(auth, email.trim())
    } catch (err) {
      throw new Error(mapFirebaseError(err))
    }
  }, [])

  const updateProfile = useCallback(
    async (data: {
      name?: string
      phone?: string
      preferences?: User["preferences"]
    }) => {
      const result = await api.auth.updateProfile(data)
      if (result.user) setUser(result.user)
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      firebaseUser,
      loading,
      firebaseStatus,
      serverFirebaseReady,
      requiresEmailVerification,
      login,
      register,
      logout,
      refreshProfile,
      resendVerification,
      resetPassword,
      updateProfile,
    }),
    [
      user,
      firebaseUser,
      loading,
      firebaseStatus,
      serverFirebaseReady,
      requiresEmailVerification,
      login,
      register,
      logout,
      refreshProfile,
      resendVerification,
      resetPassword,
      updateProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
