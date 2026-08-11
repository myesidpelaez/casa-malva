import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { initializeFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAIWpPLXdB_cHtRSHUc3_ujmC_LX4_ffnc',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'casa-malva-demo.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'casa-malva-demo',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'casa-malva-demo.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '664970465149',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:664970465149:web:319757a0d6bce50f878614',
}

let app: FirebaseApp
let auth: Auth
let db: Firestore
let storage: FirebaseStorage

function getClientApp(): FirebaseApp {
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  }
  return app
}

export function getClientAuth(): Auth {
  if (!auth) {
    auth = getAuth(getClientApp())
  }
  return auth
}

export function getClientDb(): Firestore {
  if (!db) {
    getClientAuth()
    db = initializeFirestore(getClientApp(), {
      experimentalForceLongPolling: true,
    })
  }
  return db
}

export function getClientStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getClientApp())
  }
  return storage
}
