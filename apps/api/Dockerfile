FROM node:20-alpine
WORKDIR /app
RUN npm i -g pnpm@8.8.0
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps ./apps
COPY packages ./packages
COPY public ./public
ENV ICON_API_PORT=8787
ENV STORAGE_PROVIDER=local
RUN pnpm install --frozen-lockfile
RUN pnpm run api:build
EXPOSE 8787
CMD ["node", "apps/api/dist/server.js"]
