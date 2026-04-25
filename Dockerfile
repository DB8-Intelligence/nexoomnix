# syntax=docker/dockerfile:1.6
#
# NexoOmnix — Next.js 14 standalone para Google Cloud Run.
#
# Stages:
#   1. deps     — instala dependências (cacheável)
#   2. builder  — `next build` com output standalone
#   3. runner   — imagem final minimal: só Node + standalone bundle
#
# Imagem final ~200-250 MB (vs 1+ GB com node_modules completo).
# Listening em 0.0.0.0:8080 (Cloud Run injeta PORT=8080 por default).
#
# Base: node:20-slim (Debian slim, glibc) escolhida sobre node:20-alpine
# (musl libc) porque vários binários nativos npm — notadamente sharp
# usado por next/image — quebram ou ficam frágeis em musl mesmo com
# libc6-compat. Slim é ~80 MB maior que Alpine, tradeoff aceitável.

ARG NODE_VERSION=20-slim

# ── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ── Stage 2: builder ────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Anonimiza telemetria do Next no build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Variáveis NEXT_PUBLIC_* são lidas em build-time e embutidas no bundle.
# Em produção real, passar via --build-arg ou via Cloud Build trigger.
# Em build local sem essas vars, Next usa fallback (string vazia) — rota
# pode falhar em runtime se cliente Supabase for usado sem URL/anon key.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

RUN npm run build

# ── Stage 3: runner ─────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Usuário não-root pra segurança (Debian: groupadd/useradd do pacote passwd,
# já presente no node:20-slim — diferente do addgroup/adduser do BusyBox/Alpine)
RUN groupadd --system --gid 1001 nodejs && \
    useradd  --system --uid 1001 --gid nodejs --shell /usr/sbin/nologin nextjs

# Standalone bundle (Node server + minimal deps)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Assets estáticos (imagens otimizadas, fontes, JS chunks)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Public folder (favicons, robots, etc)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 8080

# server.js é o entry point gerado pelo standalone build
CMD ["node", "server.js"]
