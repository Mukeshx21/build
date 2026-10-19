import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let app = null;
let initError = null;

function resolveServiceAccount() {
  const jsonInline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonInline && jsonInline.trim()) {
    try {
      return JSON.parse(jsonInline);
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.");
    }
  }

  const filePath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.resolve(__dirname, "secrets", "firebase-service-account.json");

  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  return null;
}

export function isFirebaseAdminConfigured() {
  return Boolean(getFirebaseAdmin());
}

export function getFirebaseAdminStatus() {
  if (app) {
    return { configured: true, error: null };
  }
  return {
    configured: false,
    error:
      initError ||
      "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON.",
  };
}

export function getFirebaseAdmin() {
  if (app) return app;
  if (initError) return null;

  try {
    const serviceAccount = resolveServiceAccount();
    if (!serviceAccount) {
      initError =
        "Firebase Admin credentials not found. Place a service account JSON at server/secrets/firebase-service-account.json or set FIREBASE_SERVICE_ACCOUNT_PATH / FIREBASE_SERVICE_ACCOUNT_JSON.";
      return null;
    }

    if (admin.apps.length) {
      app = admin.app();
    } else {
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    return app;
  } catch (err) {
    initError = err instanceof Error ? err.message : String(err);
    console.error("Firebase Admin init failed:", initError);
    return null;
  }
}

export async function verifyIdToken(idToken) {
  const firebaseApp = getFirebaseAdmin();
  if (!firebaseApp) {
    const error = new Error(getFirebaseAdminStatus().error);
    error.code = "FIREBASE_NOT_CONFIGURED";
    throw error;
  }
  return admin.auth().verifyIdToken(idToken);
}
