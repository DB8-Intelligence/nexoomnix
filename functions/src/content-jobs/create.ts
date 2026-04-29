// create-content-job — Cloud Function (Gen 1, HTTPS callable).
//
// Cria um documento em `tenants/{tenantId}/content_jobs/{jobId}` em status='queued'.
// NÃO chama provedores de IA. NÃO dispara worker. Apenas registra a intenção.
//
// Validação de tenancy via custom claims (`tenants[]` populado pelo trigger
// membershipsOnWrite). Caller deve ser membro ativo do tenant alvo.
//
// Fields seguem [data-model.md collection 7 (content_jobs)] mais campos
// retry/heartbeat da [model-validation.md ajuste 2.1/2.2]. Worker futuro
// vai atualizar status, lastHeartbeatAt, attempts, etc — não fazemos nada
// disso aqui.
//
// Specs: docs/firebase/data-model.md (collection 7)
//        docs/firebase/cloud-functions.md (handler 4 — embora aquele seja
//          worker; este aqui é o "produtor" do job)

import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'
import { randomBytes } from 'node:crypto'

if (!admin.apps.length) {
  admin.initializeApp()
}

const db = admin.firestore()

const VALID_TYPES = new Set(['text', 'image', 'reel'])

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
function nano(len: number): string {
  const bytes = randomBytes(len)
  let s = ''
  for (let i = 0; i < len; i++) {
    s += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return s
}

function generateJobId(): string {
  return `job_${nano(14)}`
}

interface CreateContentJobInput {
  tenantId?: string
  type?: string
  prompt?: string
}

interface CreateContentJobOutput {
  jobId: string
  path: string
  status: 'queued'
  expiresInDays: number
}

const RETENTION_DAYS = 30

export const createContentJob = functions
  .region('us-central1')
  .https.onCall(async (data: CreateContentJobInput, context): Promise<CreateContentJobOutput> => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required')
    }
    const uid = context.auth.uid

    const tenantId = (data?.tenantId ?? '').trim()
    const type = (data?.type ?? '').trim().toLowerCase()
    const prompt = (data?.prompt ?? '').trim()

    if (!tenantId) {
      throw new functions.https.HttpsError('invalid-argument', 'tenantId is required')
    }
    if (!VALID_TYPES.has(type)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `type must be one of: ${Array.from(VALID_TYPES).join(', ')}`
      )
    }
    if (!prompt || prompt.length > 5000) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'prompt must be 1-5000 characters'
      )
    }

    // Validar tenancy via custom claims (set pelo membershipsOnWrite trigger)
    const tenantsClaim = context.auth.token.tenants
    const memberOfTenant =
      Array.isArray(tenantsClaim) &&
      (tenantsClaim as unknown[]).includes(tenantId)
    if (!memberOfTenant) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Caller is not an active member of the specified tenant'
      )
    }

    const jobId = generateJobId()
    const path = `tenants/${tenantId}/content_jobs/${jobId}`
    const jobRef = db.doc(path)
    const now = admin.firestore.FieldValue.serverTimestamp()
    const expireAt = admin.firestore.Timestamp.fromMillis(
      Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000
    )

    await jobRef.create({
      type,
      prompt,
      status: 'queued',
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
      expireAt,
      // retry / heartbeat — worker preenche; mantemos null até lá
      attempts: 0,
      maxAttempts: 3,
      nextAttemptAt: null,
      lastHeartbeatAt: null,
      // result fields — preenchidos pelo worker
      error: null,
      result: null,
    })

    functions.logger.info('content_job created (queued, no worker)', {
      jobId,
      tenantId,
      uid,
      type,
    })

    return {
      jobId,
      path,
      status: 'queued',
      expiresInDays: RETENTION_DAYS,
    }
  })
