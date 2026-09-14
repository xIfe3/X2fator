# Build from the repo root: docker build -f apps/web/Dockerfile .
FROM node:20-slim AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @2xfactor/database build
RUN pnpm --filter @2xfactor/web build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/pnpm-workspace.yaml /repo/pnpm-lock.yaml /repo/package.json ./
COPY --from=build /repo/apps/web/package.json apps/web/package.json
COPY --from=build /repo/packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /repo/packages/database/dist packages/database/dist
COPY --from=build /repo/apps/web/.next apps/web/.next
COPY --from=build /repo/apps/web/public apps/web/public
COPY --from=build /repo/apps/web/next.config.mjs apps/web/next.config.mjs

EXPOSE 3000
WORKDIR /repo/apps/web
CMD ["pnpm", "start"]
