import { initializeApp, type FirebaseApp } from "firebase/app"
import {
  getAuth,
  type Auth,
  connectAuthEmulator,
} from "firebase/auth"

export type FirebaseClientStatus = {
  configured: boolean
  missing: string[]
  message: string
}

const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
] as const

function readConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  }
}

export function getFirebaseClientStatus(): FirebaseClientStatus {
  const config = readConfig()
  const missing = requiredKeys.filter((key) => !import.meta.env[key])
  if (missing.length) {
    return {
      configured: false,
      missing: [...missing],
      message:
        "Firebase client configuration is incomplete. Add the missing VITE_FIREBASE_* values to your .env file and restart Vite.",
    }
  }
  if (!config.apiKey || !config.projectId || !config.appId) {
    return {
      configured: false,
      missing: [...missing],
      message: "Firebase client configuration looks empty.",
    }
  }
  return {
    configured: true,
    missing: [],
    message: "Firebase client is configured.",
  }
}

let app: FirebaseApp | null = null
let auth: Auth | null = null
let emulatorConnected = false

export function getFirebaseApp(): FirebaseApp | null {
  const status = getFirebaseClientStatus()
  if (!status.configured) return null
  if (!app) {
    app = initializeApp(readConfig())
  }
  return app
}

export function getFirebaseAuth(): Auth | null {
  const firebaseApp = getFirebaseApp()
  if (!firebaseApp) return null
  if (!auth) {
    auth = getAuth(firebaseApp)
    const emulator = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL
    if (emulator && !emulatorConnected && import.meta.env.DEV) {
      connectAuthEmulator(auth, emulator, { disableWarnings: true })
      emulatorConnected = true
    }
  }
  return auth
}
