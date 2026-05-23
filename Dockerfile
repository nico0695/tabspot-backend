FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm install --frozen-lockfile

FROM deps AS builder

ARG DATABASE_URL=postgresql://tabspot:tabspot@localhost:5432/tabspot
ENV DATABASE_URL=$DATABASE_URL

COPY . .

RUN pnpm run prisma:generate
RUN pnpm run build

FROM base AS prod-deps

COPY package.json pnpm-lock.yaml .npmrc ./

RUN pnpm install --frozen-lockfile --prod --ignore-scripts

FROM base AS runtime

ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/main.js"]
