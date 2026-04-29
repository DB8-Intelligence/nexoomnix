// Firebase client SDK initialization for NexoOmnix V2.
// Reads config from NEXT_PUBLIC_FIREBASE_* env vars (apps/v2/.env.local).

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFunctions, type Functions } from 'firebase/functions'

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// HMR-safe singleton
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(config)

export const auth: Auth = getAuth(app)
// Functions na mesma região onde createTenant foi deployada
export const functions: Functions = getFunctions(app, 'us-central1')
export default app
