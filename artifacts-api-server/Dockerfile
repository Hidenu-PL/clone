FROM node:22-alpine AS builder
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json ./
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

FROM node:22-alpine
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json ./
COPY lib/ lib/
COPY artifacts/api-server/package.json artifacts/api-server/package.json

RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/artifacts/api-server/dist artifacts/api-server/dist

ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
