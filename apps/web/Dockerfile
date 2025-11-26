FROM node:20-alpine AS builder
WORKDIR /app
RUN npm i -g pnpm@8.8.0
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps ./apps
COPY packages ./packages
ENV VITE_BASE=/
ENV VITE_USE_HASH_ROUTER=false
ENV VITE_ICON_API_URL=http://localhost:8787
RUN pnpm install --frozen-lockfile
RUN VITE_BASE=$VITE_BASE VITE_USE_HASH_ROUTER=$VITE_USE_HASH_ROUTER VITE_ICON_API_URL=$VITE_ICON_API_URL pnpm -C apps/web build

FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/apps/web/dist .
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
