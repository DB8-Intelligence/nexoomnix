# ADR-0002 — Stripe webhook handler stays outside the `BillingProvider` contract

- **Status:** Accepted
- **Data:** 2026-04-23
- **Autor:** Douglas Bonânzza (com Claude como pair arquitetural)
- **Relacionado:** [ADR-0001](./ADR-0001-module-boundaries.md)

## Contexto

Com a Sprint 4 (criação do `BillingProvider`) e Sprint 5 (consolidação de billing com `createBillingPortalSession`), o padrão **contract → adapter → factory → use case → route** está validado para as rotas síncronas de billing (`/api/stripe/create-checkout` e `/api/stripe/portal`).

Resta decidir o que fazer com `/api/stripe/webhook`. O handler atual usa o SDK do Stripe em dois pontos:

1. `stripe.webhooks.constructEvent(body, sig, secret)` — valida a assinatura HMAC do evento que o Stripe enviou.
2. `stripe.subscriptions.retrieve(id)` — busca a subscription completa associada a uma `checkout.session.completed`.

As opções avaliadas foram:

1. **Migrar para o contract** — adicionar `verifyWebhookSignature(rawBody, signature): Event` e `getSubscription(id)` ao `BillingProvider`.
2. **Manter fora do contract** — webhook handler continua importando o SDK diretamente.
3. **Meio-termo** — abstrair só `getSubscription` (que é genérica) e deixar a verificação de assinatura inline (que é Stripe-específica).

## Decisão

**Opção 2: o webhook handler fica fora do `BillingProvider` contract.**

O arquivo `src/app/api/webhooks/stripe/route.ts` continua importando o SDK do Stripe diretamente (via `@/lib/stripe`) para verificação de assinatura e retrieval de subscription.

## Alternativas consideradas

### Opção 1 — abstrair no contract

Rejeitada. Verificação de assinatura de webhook é inerentemente específica do provedor:

- **Formato do header**: Stripe usa `Stripe-Signature: t=…,v1=…`. Kiwify, Pagar.me, Hotmart cada um tem o seu.
- **Payload canônico**: Stripe assina `timestamp.payload`. Outros assinam diferente.
- **Algoritmo**: HMAC-SHA256 no Stripe, mas a API de `constructEvent` reconstrói um objeto `Event` tipado pelo SDK — valor que não se traduz genericamente.

Abstrair `verifyWebhookSignature` no `BillingProvider` forçaria um denominador comum artificial (`RawEvent { type: string; data: unknown }`) e exigiria que cada adapter reimplementasse o parser. Adiciona complexidade sem ganho de portabilidade — no dia em que for preciso adicionar Kiwify, o webhook dele **vai precisar** de uma rota separada com validação própria, porque o protocolo é diferente.

### Opção 3 — abstrair só `getSubscription`

Rejeitada por enquanto. `stripe.subscriptions.retrieve()` é usado **um único lugar** (o handler de `checkout.session.completed`). Adicionar ao contract por um único caller viola a regra "só abstrair quando houver mais de um consumer". Se um segundo consumer aparecer, revisitar.

## Consequências

### Aceitas

- O handler do webhook mantém acoplamento direto ao SDK do Stripe. Esperado: webhooks são o ponto de **entrada** do provedor — é natural que saibam sua linguagem nativa.
- Num cenário hipotético de troca Stripe → Kiwify, o webhook Stripe seria arquivado e um novo `src/app/api/webhooks/kiwify/route.ts` seria criado. Zero esforço reaproveitado do webhook antigo — e isso é OK, porque os protocolos são genuinamente diferentes.
- `src/lib/stripe.ts` continua existindo (re-exportado pelo adapter via `getStripe()` e pelo webhook diretamente). Sua remoção fica para quando o webhook também deixar de existir ou também migrar para uma pasta de infra (`modules/billing/infra/webhook/`).

### Rejeitadas

- **Falsa portabilidade**. Não queremos uma interface `WebhookVerifier` que promete abstrair algo que, na realidade, é sempre um fork no provedor.
- **Indireção sem valor**. Uma camada a mais (`provider.verifyWebhookSignature(req)`) apenas para devolver o mesmo `Stripe.Event` ao handler não simplifica nada.

## Reavaliação futura

Revisar esta decisão se e somente se:

1. Um segundo provedor for adicionado e seus webhooks compartilharem **estrutura de payload** (unlikely).
2. Houver necessidade de rotear o mesmo webhook para múltiplos destinos (ex: enviar eventos para n8n E processar local). Nesse caso, a abstração seria sobre o pipeline, não sobre o provider.
3. A Sprint de migração completa do billing para `modules/billing/infra/` optar por mover o handler do webhook junto. Mesmo nesse caso, ele continuará Stripe-específico — só muda de pasta.
