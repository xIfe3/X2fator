# Build context: ./api   (docker build -f api/Dockerfile api)
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:20-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# runMigrations() reads SQL from /app/drizzle at boot — without this the
# container exits on startup with "Failed to apply database migrations".
COPY --from=build /app/drizzle ./drizzle
# Local-disk upload fallback (only used when S3_* env vars are unset).
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 4545
CMD ["node", "dist/main.js"]
