// Firebase Cloud Functions — NexoOmnix V2 entry point.
//
// Cada função exportada aqui vira um deploy independente do Firebase CLI.
// Mantemos uma export por função para deploy granular (`firebase deploy --only functions:authOnCreate`).

export { authOnCreate } from './auth/on-create'
export { membershipsOnWrite } from './memberships/on-write'
export { createTenant } from './tenants/create-tenant'
export { createContentJob } from './content-jobs/create'
