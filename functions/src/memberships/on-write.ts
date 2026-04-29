// memberships-on-write — Cloud Function (Gen 1, trigger Firestore onWrite).
//
// Sincroniza custom claims do Firebase Auth com memberships ativos.
// Calcula `tenants[]` e `roles{tenantId: role}` a partir do snapshot atual
// de memberships do user afetado, preservando claims não relacionadas.
//
// Idempotente: re-executar com mesmo input produz mesmo resultado;
// se claims já estão no estado correto, pula `setCustomUserClaims`.
//
// Implementação Gen 1 — Gen 2 via `gcloud functions deploy --trigger-event-filters-path-pattern`
// produz Eventarc CloudEvent que o SDK `firebase-functions/v2/firestore` não decodifica
// como esperado (event.data.before.data() vem undefined). Gen 1 nativo é estável.
//
// Specs: docs/firebase/data-model.md (collection 3 — memberships, custom claims)
//        docs/firebase/cloud-functions.md (handler 2)

import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()
const auth = admin.auth()

interface MembershipDoc {
  userId?: string
  tenantId?: string
  role?: string
  status?: string
}

export const membershipsOnWrite = functions
  .region('us-central1')
  .firestore.document('memberships/{id}')
  .onWrite(async (change, context) => {
    const before = change.before.exists
      ? (change.before.data() as MembershipDoc | undefined)
      : undefined
    const after = change.after.exists
      ? (change.after.data() as MembershipDoc | undefined)
      : undefined

    // Pode ser create (sem before), update, ou delete (sem after).
    // userId pode estar em qualquer um — usar after primeiro, fallback para before.
    const userId = after?.userId ?? before?.userId
    if (!userId) {
      functions.logger.warn('no userId on either before or after — skipping', {
        membershipId: context.params.id,
      })
      return
    }

    // Re-query estado atual completo (idempotente — não confiar em delta do evento)
    const snap = await db
      .collection('memberships')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get()

    const tenants: string[] = []
    const roles: Record<string, string> = {}
    snap.forEach((doc) => {
      const m = doc.data() as MembershipDoc
      if (m.tenantId) {
        tenants.push(m.tenantId)
        if (m.role) {
          roles[m.tenantId] = m.role
        }
      }
    })

    // Lê claims atuais do user para preservar campos não relacionados a tenancy.
    let userRecord: admin.auth.UserRecord
    try {
      userRecord = await auth.getUser(userId)
    } catch (err) {
      functions.logger.error('Auth user not found — skipping claim sync', { userId, err })
      return
    }
    const existing = (userRecord.customClaims ?? {}) as Record<string, unknown>

    // Idempotência: comparar tenants + roles serializados antes de gravar.
    const existingTenants = JSON.stringify(existing.tenants ?? [])
    const existingRoles = JSON.stringify(existing.roles ?? {})
    const newTenants = JSON.stringify(tenants)
    const newRoles = JSON.stringify(roles)
    if (existingTenants === newTenants && existingRoles === newRoles) {
      functions.logger.info('claims unchanged — no-op', { userId, count: tenants.length })
      return
    }

    const updated = { ...existing, tenants, roles }
    await auth.setCustomUserClaims(userId, updated)

    functions.logger.info('claims updated', {
      userId,
      tenantsCount: tenants.length,
      tenants,
      previousCount: (existing.tenants as string[] | undefined)?.length ?? 0,
    })
  })
