// Emails da equipe DB8 Intelligence autorizados a ver áreas admin
// (Skills Factory, dashboards internos, etc).
// Quando escalar pra mais gente, migrar pra coluna `role='staff'` em profiles.
const DB8_STAFF_EMAILS = new Set<string>([
  'dmbbonanza@gmail.com',
])

export function isDb8Staff(email: string | null | undefined): boolean {
  if (!email) return false
  return DB8_STAFF_EMAILS.has(email.toLowerCase())
}
