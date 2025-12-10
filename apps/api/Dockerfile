FROM node:20-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy entire monorepo
COPY . .

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm run build

# Create a pruned production deployment for the api app
RUN pnpm --filter api --prod deploy /prod/api

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy the pruned deployment
COPY --from=builder --chown=node:node /prod/api .

EXPOSE 8787

USER node

CMD ["node", "dist/server.js"]
