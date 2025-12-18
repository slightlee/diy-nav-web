FROM node:20-alpine AS prune
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=web --docker

FROM node:20-alpine AS builder
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy pruned json files (package.json, pnpm-lock.yaml)
COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy pruned source code
COPY --from=prune /app/out/full/ .
COPY --from=prune /app/tsconfig.base.json .
COPY --from=prune /app/turbo.json .
COPY --from=prune /app/tsup.config.ts .

# Build Args
ARG VITE_API_BASE_URL
ARG VITE_LINUX_DO_CLIENT_ID
ARG VITE_LINUX_DO_REDIRECT_URI

# Build
RUN npx turbo run build --filter=web...

# Production stage
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
