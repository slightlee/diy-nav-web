FROM node:20-alpine AS prune
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=api --docker

FROM node:20-alpine AS builder
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy pruned json files
COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy pruned source code
COPY --from=prune /app/out/full/ .
COPY --from=prune /app/tsconfig.base.json .
COPY --from=prune /app/turbo.json .

# Build
RUN npx turbo run build --filter=api...

# Create a pruned production deployment for the api app
RUN pnpm --filter api --prod deploy /prod/api

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy the pruned deployment
COPY --from=builder --chown=node:node /prod/api .

EXPOSE 8787

USER node

CMD ["node", "dist/apps/api/server.js"]
