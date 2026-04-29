// create-tenant — Cloud Function (Gen 1, HTTPS callable).
//
// Onboarding atômico de tenant:
//   - reserva slug (shadow collection)
//   - cria tenants/{tenantId}
//   - cria memberships/{uid}__{tenantId} com role=owner
//   - atualiza users/{uid}.defaultTenantId apenas se for o primeiro tenant do user
//   - registra audit_logs/{logId}
//
// Tudo em uma transação Firestore — falha em qualquer passo reverte tudo.
//
// Múltiplos tenants permitidos: user pode chamar várias vezes; cada chamada cria
// novo tenant + membership com role=owner. Apenas o PRIMEIRO tenant define
// users/{uid}.defaultTenantId; chamadas seguintes preservam o default existente.
//
// Custom claims (`tenants[]`, `roles{}`) são sincronizadas pelo trigger
// membershipsOnWrite após o write da membership — client deve chamar
// `user.getIdToken(true)` para refrescar o token e ver as claims novas.
//
// Specs: docs/firebase/data-model.md (collections 1, 2, 3, 9, 10)
//        docs/firebase/cloud-functions.md (handler 3)
//        docs/firebase/model-validation.md (Fluxo 1)

import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { randomBytes } from 'node:crypto'

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

// kebab-case 3-50 chars, começa com letra, [a-z0-9-]
const SLUG_REGEX = /^[a-z][a-z0-9-]{2,49}$/

// Mesmo enum do V1 (CLAUDE.md). Nicho `imoveis` removido do escopo.
const VALID_NICHES = new Set([
  'beleza',
  'tecnico',
  'saude',
  'juridico',
  'pet',
  'educacao',
  'nutricao',
  'engenharia',
  'fotografia',
  'gastronomia',
  'fitness',
  'financas',
])

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

function nano(len: number): string {
  const bytes = randomBytes(len)
  let s = ''
  for (let i = 0; i < len; i++) {
    s += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return s
}

function generateTenantId(): string {
  return `tnt_${nano(12)}`
}

function generateLogId(): string {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return `log_${date}_${nano(12)}`
}

interface CreateTenantInput {
  tenantName?: string
  slug?: string
  niche?: string
}

interface CreateTenantOutput {
  tenantId: string
  membershipId: string
  isFirstTenant: boolean
}

export const createTenant = functions
  .region('us-central1')
  .https.onCall(async (data: CreateTenantInput, context): Promise<CreateTenantOutput> => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required')
    }
    const uid = context.auth.uid

    const tenantName = (data?.tenantName ?? '').trim()
    const slug = (data?.slug ?? '').trim().toLowerCase()
    const nicheRaw = (data?.niche ?? '').trim().toLowerCase()
    const niche = nicheRaw || null

    if (!tenantName || tenantName.length > 100) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'tenantName must be 1-100 characters'
      )
    }
    if (!SLUG_REGEX.test(slug)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'slug must be lowercase, start with a letter, 3-50 chars, and use only [a-z0-9-]'
      )
    }
    if (niche && !VALID_NICHES.has(niche)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `niche must be one of: ${Array.from(VALID_NICHES).join(', ')}`
      )
    }

    const tenantId = generateTenantId()
    const membershipId = `${uid}__${tenantId}`
    const logId = generateLogId()
    const now = admin.firestore.FieldValue.serverTimestamp()
    // expireAt = createdAt + 365d (TTL config separada habilita expiração real)
    const expireAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + 365 * 24 * 60 * 60 * 1000
    )

    const slugRef = db.doc(`slugs/${slug}`)
    const tenantRef = db.doc(`tenants/${tenantId}`)
    const membershipRef = db.doc(`memberships/${membershipId}`)
    const userRef = db.doc(`users/${uid}`)
    const auditRef = db.doc(`audit_logs/${logId}`)

    let isFirstTenant = false

    await db.runTransaction(async (txn) => {
      // 1. Slug uniqueness — falha se já reservado
      const slugDoc = await txn.get(slugRef)
      if (slugDoc.exists) {
        throw new functions.https.HttpsError(
          'already-exists',
          `slug "${slug}" is already taken`
        )
      }

      // 2. User doc deve existir (criado por authOnCreate trigger)
      const userDoc = await txn.get(userRef)
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'user document not initialized; retry after a moment'
        )
      }
      const userData = userDoc.data() ?? {}
      isFirstTenant = !userData.defaultTenantId

      // 3. Reserva slug
      txn.create(slugRef, { tenantId, createdAt: now })

      // 4. Cria tenant
      txn.create(tenantRef, {
        name: tenantName,
        slug,
        niche,
        plan: 'trial',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        trialEndsAt: null,
        simulateAi: false,
        whatsappNumber: null,
        branding: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })

      // 5. Cria membership como owner
      txn.create(membershipRef, {
        userId: uid,
        tenantId,
        role: 'owner',
        status: 'active',
        invitedBy: null,
        invitedAt: null,
        acceptedAt: now,
        createdAt: now,
        updatedAt: now,
      })

      // 6. Atualiza user — defaultTenantId apenas se for o primeiro
      const userUpdate: Record<string, unknown> = { updatedAt: now }
      if (isFirstTenant) {
        userUpdate.defaultTenantId = tenantId
      }
      txn.update(userRef, userUpdate)

      // 7. Audit log
      txn.create(auditRef, {
        tenantId,
        actorUserId: uid,
        action: 'tenant.created',
        resource: { type: 'tenant', id: tenantId, path: `tenants/${tenantId}` },
        before: null,
        after: { name: tenantName, slug, niche, plan: 'trial' },
        ip: null,
        userAgent: null,
        createdAt: now,
        expireAt,
      })
    })

    functions.logger.info('tenant created', {
      tenantId,
      slug,
      uid,
      isFirstTenant,
    })

    return { tenantId, membershipId, isFirstTenant }
  })
