# Billing Webhooks — Runbook operacional

> Status: Sprint 10 (2026-04-24). Manual cleanup apenas. Nenhum cron automático.

## Contexto

A Sprint 7 introduziu idempotência no webhook Stripe via tabela
`stripe_webhook_events`. Fluxo esperado:

```
(entrega)  → INSERT status='processing', received_at=now()
(sucesso)  → UPDATE status='processed',  processed_at=now()
(erro)     → UPDATE status='failed',     failed_at=now(), error_message=<msg>
```

### O problema: zombie events

Se o processo Node crashar **após** o INSERT e **antes** de chamar
`markProcessed` ou `markFailed`, o evento fica preso em
`status='processing'` indefinidamente. Consequências:

- Redeliveries do Stripe pra este `event.id` são classificadas como
  `in-flight` (caminho "em andamento") e **retornam 200 sem processar**
  — o side effect legítimo nunca acontece.
- A tabela acumula zombies até intervenção manual.

Em produção, essas falhas devem ser raras (requerem crash mid-request).
Causas possíveis:
- Vercel function timeout (15s default na rota)
- Crash do Node por OOM ou bug inesperado
- Deploy/restart no meio de um processing

Não há cron automático nesta sprint — validamos a idempotência (Sprint 8)
e deixamos o cleanup como ferramenta manual operacional.

## Quando usar o cleanup

Rodar **dry-run primeiro, sempre**. Sinais de que vale rodar:

- Reclamação de cliente: "paguei e o plano não ativou" após N minutos
- Stripe dashboard mostra eventos retentando (entregas múltiplas com
  resposta 200 mas side effect não aconteceu)
- Query de sanidade mostrou zombies:

```sql
SELECT id, type, received_at, now() - received_at AS age
FROM stripe_webhook_events
WHERE status = 'processing'
  AND received_at < now() - interval '10 minutes'
ORDER BY received_at ASC;
```

Threshold de **10 minutos** é seguro: a route tem timeout Vercel de 15s,
então qualquer processing legítimo termina (com processed/failed) bem
antes disso. Eventos processing com mais de 10 min são zombies reais.

## Como rodar

### Dry-run (sempre começa por aqui)

```bash
node scripts/cleanup-webhook-zombies.mjs
# ou com threshold custom:
node scripts/cleanup-webhook-zombies.mjs --minutes=15
```

Saída esperada quando não há zombies:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Stripe Webhook Zombie Cleanup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Threshold: eventos processing > 10 min atrás
🔑 Mode:      DRY-RUN (read-only)
🗄️  DB URL:    https://pclqjwegljrglaslppag.supabase.co

✅ Nenhum zombie encontrado (processing > 10 min).
```

Saída quando há candidatos:

```
🧟 2 evento(s) zombie:

  evt_1TAbc...
    type:        checkout.session.completed
    received_at: 2026-04-24T18:32:14.000+00:00
    age:         47 min

  evt_1TXyz...
    type:        invoice.payment_failed
    received_at: 2026-04-24T19:05:02.000+00:00
    age:         14 min

ℹ️  DRY-RUN — nenhuma alteração feita no banco.
    Para marcar estes 2 evento(s) como 'failed':
    node scripts/cleanup-webhook-zombies.mjs --minutes=10 --apply
```

### Apply (só depois de revisar o dry-run)

```bash
node scripts/cleanup-webhook-zombies.mjs --apply
# ou:
node scripts/cleanup-webhook-zombies.mjs --minutes=15 --apply
```

Ação executada:
- `UPDATE stripe_webhook_events SET status='failed', failed_at=now(), error_message='Marked failed by zombie cleanup after <N> minutes' WHERE id IN (...) AND status='processing'`
- Filtro `status='processing'` é defensivo: se um evento foi transicionado por outro processo entre o dry-run e o apply, esse rollback não é desfeito.

## Riscos

| Risco | Mitigação |
|---|---|
| Marcar como `failed` um evento que estava **legitimamente** em processing (ex: request lenta de 11 min) | Threshold padrão (10 min) é bem maior que o timeout da rota Vercel (15s). Subir para --minutes=30 se houver integração pesada. |
| Race com processing real: entre o SELECT e o UPDATE, o evento é finalizado | UPDATE tem `WHERE status='processing'` — evento já processed/failed é preservado. Script reporta o descompasso. |
| Apply acidental | Script exige flag `--apply` explícita. Default é dry-run. Impossível rodar APPLY sem intenção. |
| Threshold muito baixo (ex: `--minutes=1`) | Script aceita, mas o output lista os candidatos antes — é fácil abortar antes de adicionar `--apply`. Não há proteção adicional contra valores baixos propositais. |
| Service role key vazar | Script lê de `.env.local` ou env do shell. Nunca recebe key por CLI arg. |

## O que o script **não faz**

- ❌ Não chama Stripe (nem pra marcar eventos como dismissed lá — a contagem de retries do Stripe é independente)
- ❌ Não chama Resend (nem pra notificar sobre falha)
- ❌ Não reprocessa o side effect que faltou (o evento fica em `failed`; operador decide se dispara retry manual pelo Stripe dashboard)
- ❌ Não cria novas rows, só atualiza existentes
- ❌ Não altera eventos `processed` ou `failed`
- ❌ Não altera `processing` recente (dentro do threshold)

## Como validar depois do apply

```sql
-- 1) Confirmar que os zombies agora estão como 'failed'
SELECT id, type, status, failed_at, error_message
FROM stripe_webhook_events
WHERE status = 'failed'
  AND error_message LIKE 'Marked failed by zombie cleanup%'
ORDER BY failed_at DESC
LIMIT 20;

-- 2) Confirmar que não há mais zombies além do threshold
SELECT count(*) AS remaining_zombies
FROM stripe_webhook_events
WHERE status = 'processing'
  AND received_at < now() - interval '10 minutes';

-- 3) Saúde geral da tabela
SELECT status, count(*) AS n
FROM stripe_webhook_events
GROUP BY status
ORDER BY status;
```

### Reprocessamento manual de um zombie específico

Se precisar **forçar o side effect** de um zombie agora marcado como
failed (ex: cliente ligando reclamando que pagou e o plano não ativou):

1. Copiar o `event.id` do registro failed
2. Ir no Stripe dashboard → Developers → Events → buscar o `event.id`
3. Clicar em "Resend" no evento
4. A próxima entrega vai disparar `retry-failed` no repository (transição
   atômica `failed → processing`), processar normalmente e marcar `processed`.

Isso é o design da Sprint 7 — `status='failed'` é elegível para retry
controlado na próxima entrega do mesmo `event.id`.

## Observações para futura automação via cron

Quando fizer sentido automatizar este cleanup (sinais: ocorrer mais de
uma vez por semana, ou time ops estiver sendo acionado fora de horário):

1. **Opção A — Vercel Cron**: agendar rota protegida em
   `/api/cron/cleanup-webhook-zombies` rodando 1x/hora. Header
   `Authorization: Bearer ${CRON_SECRET}` no middleware. Threshold
   conservador (30 min). Output pra logs + (opcional) webhook pro
   Slack/Discord em caso de não-zero cleanup.
2. **Opção B — n8n workflow**: scheduled trigger chamando rota Next
   ou direto no Supabase via SQL. Mais visibilidade mas mais moving
   parts. Natural se eventualmente mover todo billing pra workflows.
3. **Opção C — Supabase pg_cron**: roda dentro do banco sem app
   intermediário. Mais isolado. Menos visibilidade para o dev team.

Para qualquer opção, considerar:
- Log por execução (cron_execution_log table) com count de limpados
- Alerta acima de threshold (ex: >5 zombies/hora = sinal de bug upstream)
- Threshold mais alto (30-60 min) pra evitar false positives de picos
  de latência

## Referências cruzadas

- Sprint 7 (`f6716ca`): implementação da idempotência
- Sprint 8 (`ef629c2`): validação end-to-end do fluxo idempotente
- Repository: [src/modules/billing/infra/stripe-webhook-event-repository.ts](../../src/modules/billing/infra/stripe-webhook-event-repository.ts)
- Migration: [supabase/migrations/022_stripe_webhook_events.sql](../../supabase/migrations/022_stripe_webhook_events.sql)
- ADR-0002: webhook fica fora do BillingProvider contract
