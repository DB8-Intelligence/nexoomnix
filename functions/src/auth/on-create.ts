// auth-on-create — Cloud Function (Gen 1, trigger Firebase Auth).
//
// Garante que `users/{uid}` exista no Firestore após signup no Firebase Auth.
// Idempotente: se o doc já existir, não sobrescreve.
//
// Specs: docs/firebase/data-model.md (collection 1 — users)
//        docs/firebase/cloud-functions.md (handler 1)

import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

export const authOnCreate = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid
  const userRef = db.doc(`users/${uid}`)

  // Idempotência — se já existir, não sobrescrever (preserva campos editados pelo client).
  const existing = await userRef.get()
  if (existing.exists) {
    functions.logger.info('users doc already exists — skipping', { uid })
    return
  }

  const now = admin.firestore.FieldValue.serverTimestamp()
  await userRef.create({
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    defaultTenantId: null,
    locale: 'pt-BR',
    timezone: 'America/Bahia',
    marketingOptIn: false,
    createdAt: now,
    updatedAt: now,
  })

  functions.logger.info('users doc created', { uid, email: user.email ?? null })
})
