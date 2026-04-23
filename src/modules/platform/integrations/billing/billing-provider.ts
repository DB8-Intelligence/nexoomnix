/**
 * Contract de billing — mantido intencionalmente pequeno.
 *
 * Cobre as 3 operações usadas pelas rotas síncronas de billing
 * (create-checkout + portal). Webhook NÃO está no contract — ver
 * `docs/architecture/ADR-0002-stripe-webhook-outside-billing-contract.md`.
 *
 * O contract é agnóstico ao provedor: adapters concretos (Stripe hoje,
 * potencialmente Kiwify/Pagar.me amanhã) implementam esta interface.
 */

export interface CreateCustomerInput {
  /** Email do pagador. Opcional no Stripe; o provedor decide o tratamento. */
  email?: string
  /** Nome de exibição do customer. */
  name: string
  /** Metadata livre — útil para correlacionar com tenant_id da plataforma. */
  metadata?: Record<string, string>
}

export interface BillingCustomer {
  /** ID do customer no provedor (ex: cus_XYZ no Stripe). */
  id: string
}

export interface CreateCheckoutSessionInput {
  customerId: string
  priceId: string
  successUrl: string
  cancelUrl: string
  /** Metadata da sessão (não da subscription). */
  metadata?: Record<string, string>
  /** Metadata propagada para a subscription gerada pelo checkout. */
  subscriptionMetadata?: Record<string, string>
  /** Ex: 'pt-BR'. Adapter valida contra seu conjunto suportado. */
  locale?: string
  allowPromotionCodes?: boolean
  /** Texto customizado exibido junto ao botão de submit no checkout. */
  submitMessage?: string
}

export interface BillingCheckoutSession {
  id: string
  /** URL para redirecionamento do cliente. Pode ser null em edge cases. */
  url: string | null
}

export interface CreateBillingPortalSessionInput {
  customerId: string
  /** URL para onde o portal devolve o cliente depois da interação. */
  returnUrl: string
}

export interface BillingPortalSession {
  id: string
  url: string
}

export interface BillingProvider {
  createCustomer(input: CreateCustomerInput): Promise<BillingCustomer>
  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<BillingCheckoutSession>
  createBillingPortalSession(
    input: CreateBillingPortalSessionInput,
  ): Promise<BillingPortalSession>
}

// ── Fallback provider ─────────────────────────────────────────────────────
//
// Quando `STRIPE_SECRET_KEY` (ou o equivalente de outro provedor) não está
// configurada, o factory retorna `NullBillingProvider` em vez de deixar
// o SDK explodir numa call distante. Isso torna a falha explícita e
// tipada (`BillingNotConfiguredError`), facilitando o tratamento nas
// camadas superiores em ambientes de dev/CI sem chaves de teste.

export class BillingNotConfiguredError extends Error {
  constructor() {
    super('billing-not-configured')
    this.name = 'BillingNotConfiguredError'
  }
}

export class NullBillingProvider implements BillingProvider {
  async createCustomer(): Promise<BillingCustomer> {
    throw new BillingNotConfiguredError()
  }
  async createCheckoutSession(): Promise<BillingCheckoutSession> {
    throw new BillingNotConfiguredError()
  }
  async createBillingPortalSession(): Promise<BillingPortalSession> {
    throw new BillingNotConfiguredError()
  }
}
