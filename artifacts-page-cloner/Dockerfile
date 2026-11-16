FROM node:22-alpine AS builder
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json ./
COPY lib/ lib/
COPY artifacts/page-cloner/ artifacts/page-cloner/

RUN pnpm install --frozen-lockfile

ARG BASE_PATH=/
ARG PORT=4173
ENV BASE_PATH=${BASE_PATH}
ENV PORT=${PORT}
ENV NODE_ENV=production

RUN pnpm --filter @workspace/page-cloner run build

FROM nginx:1.27-alpine
COPY --from=builder /app/artifacts/page-cloner/dist/public /usr/share/nginx/html
COPY artifacts/page-cloner/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
