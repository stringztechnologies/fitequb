FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/bot/package.json ./apps/bot/

RUN pnpm install --frozen-lockfile --prod=false

COPY packages/shared/ ./packages/shared/
COPY apps/bot/ ./apps/bot/
COPY tsconfig.base.json ./

RUN pnpm --filter @fitequb/shared build && pnpm --filter @fitequb/bot build

# Production stage
FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/bot/package.json ./apps/bot/

RUN pnpm install --frozen-lockfile --prod

COPY --from=base /app/packages/shared/dist ./packages/shared/dist
COPY --from=base /app/apps/bot/dist ./apps/bot/dist

ENV NODE_ENV=production

CMD ["node", "apps/bot/dist/index.js"]
