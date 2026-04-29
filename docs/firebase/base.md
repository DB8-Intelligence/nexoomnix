# Firebase V2 Foundation

Base Firebase limpa e fechada (`deny-all`) para o projeto **`db8-nexoomnix`**, provisionada via script idempotente. **Sem conexão com o app V1 atual** (Supabase + Cloud Run `nexoomnix-web`).

Script: [`scripts/provision-firebase-base.mjs`](../../scripts/provision-firebase-base.mjs)
Regras: [`firebase/firestore.rules`](../../firebase/firestore.rules) · [`firebase/storage.rules`](../../firebase/storage.rules)

## Por que existe

- **V1 atual:** stack Supabase Postgres + RLS, deployada em Cloud Run (`nexoomnix-web` em `db8-nexoomnix` GCP project)
- **V2 Foundation (este doc):** Firestore + Firebase Auth + Firebase Storage, **vazio**, **fechado por padrão**

A decisão sobre uso do Firebase (V2 do produto, piloto, eventual migração) é **separada** e está fora do escopo deste setup. O objetivo aqui é apenas garantir que existe uma base limpa, idempotente e segura quando alguém decidir partir pra cima.

## NÃO usar para...

- Modificar comportamento do app V1 em produção
- Migrar dados/usuários do Supabase sem plano explícito (Firestore é NoSQL — modelo Postgres não traduz direto)
- Conectar provedores externos (Stripe, Resend, Anthropic, Meta, Canva, n8n)
- Liberar regras permissivas sem antes definir modelo de dados

## Estado provisionado

| Componente | Valor |
|---|---|
| Project ID | `db8-nexoomnix` |
| Project Number | `101218406971` |
| Firestore database | `(default)` em modo `FIRESTORE_NATIVE`, location `us-central1` |
| Firebase Auth | Identity Platform inicializado, Email/Password habilitado |
| Storage bucket | `gs://db8-nexoomnix-default` (uniform bucket-level access) |
| Firestore rules | release `cloud.firestore` → ruleset deny-all |
| Storage rules | release `firebase.storage/db8-nexoomnix-default` → ruleset deny-all |

## Como rodar o script

Pré-requisitos:

- `gcloud` CLI autenticado (`gcloud auth login`)
- Node 20+ (para `fetch` nativo)
- Permissão de Editor/Owner no projeto `db8-nexoomnix`

```bash
node scripts/provision-firebase-base.mjs
```

Variáveis de ambiente opcionais:

| Var | Default | Quando usar |
|---|---|---|
| `FIREBASE_PROJECT` | `db8-nexoomnix` | Provisionar em outro projeto GCP |
| `GCLOUD_BIN` | `gcloud` | Path com espaços (ex: Windows `C:\Path with spaces\gcloud.cmd`) |
| `ACCESS_TOKEN` | — | CI/CD onde `gcloud` não está disponível mas você tem token via service account |

Exemplo CI:

```bash
ACCESS_TOKEN=$(gcloud auth print-access-token) \
  node scripts/provision-firebase-base.mjs
```

## O que o script faz (em ordem)

Cada step verifica antes de agir — re-executar é seguro.

1. **APIs** — habilita `firebase`, `firestore`, `identitytoolkit`, `firebasestorage`, `firebaserules`
2. **Firebase project association** — `addFirebase` se ainda não associado
3. **Firestore** — cria `(default)` em modo Native em `us-central1` se não existir
4. **Auth** — inicializa Identity Platform se necessário, habilita Email/Password
5. **Storage** — cria bucket `${project}-default` em Cloud Storage e linka a Firebase Storage
6. **Rules** — aplica as 2 rules deny-all (Firestore release `cloud.firestore`, Storage release `firebase.storage/${project}-default`)

Cada step loga prefixo `→` (ação), `·` (skip), `✓` (concluído), `!` (warn), `✗` (erro).

## Validar no Firebase Console

URL: <https://console.firebase.google.com/project/db8-nexoomnix/overview>

| Onde | Olhar | Esperado |
|---|---|---|
| **Build → Firestore Database** | Mode + Location | `Native mode` · `us-central1` |
| **Build → Firestore Database → Rules** | Conteúdo da release ativa | `allow read, write: if false;` |
| **Build → Authentication → Sign-in method** | Email/Password | `Enabled` |
| **Build → Storage** | Bucket listado | `gs://db8-nexoomnix-default` |
| **Build → Storage → Rules** | Conteúdo | `allow read, write: if false;` |
| **Build → Hosting** | Site `db8-nexoomnix` | Provisionado mas vazio (não usar) |

## Edge cases conhecidos

### Firestore criado em DATASTORE_MODE

Acontece quando `addFirebase` cria o database antes do `gcloud firestore databases create --type=firestore-native`. O modo não pode ser alterado in-place; é preciso deletar e recriar.

O script detecta e para com mensagem indicando o fix manual:

```bash
gcloud firestore databases delete --database='(default)' --project=db8-nexoomnix --quiet
# espera ~5 minutos de cooldown
node scripts/provision-firebase-base.mjs
```

### Cooldown de 5 minutos

Após `databases delete`, o GCP impõe ~5min de cooldown antes de recriar database com mesmo ID. Mensagem típica: `Database ID '(default)' is not available in project '...'. Please retry in 278 seconds.`

### Bucket `.firebasestorage.app` não disponível

O nome convencional `${project}.firebasestorage.app` é reservado pelo Google e exige domain verification. O script usa `${project}-default` como nome compatível e funcional. Se quiser o convencional depois, faça verification e re-rode com `--bucket` ajustado.

### Cloud Storage bucket existe mas não está linkado a Firebase

Pode acontecer se alguém criou bucket via gcloud sem `addFirebase`. O script detecta e linka.

## Próximos passos (cada um requer decisão explícita — fora do escopo deste doc)

| # | Passo | Status |
|---|---|---|
| 1 | Registrar **Web App** no Firebase project (`firebase apps:create web` ou via Console) — gera config (`apiKey`, `authDomain`, `appId`) | ⬜ pendente |
| 2 | Definir **modelo Firestore** (collections + document shapes) e evoluir regras | 🟡 **proposta em [data-model.md](data-model.md)** — não aplicada |
| 3 | Configurar **provedores OAuth** Auth (Google, Facebook) se aplicável | ⬜ pendente |
| 4 | Definir uso de **Firebase Hosting** (frontend? estático? SSR?) | ⬜ pendente |
| 5 | Decidir **integração com app V1**: paralelo permanente, migração faseada, ou Firebase fica em standby | ⬜ pendente |
