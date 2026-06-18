# syntax=docker/dockerfile:1

# --- Build stage: install deps and bundle the Preact client ---
FROM oven/bun:1 AS build
WORKDIR /app

# Install dependencies against the committed lockfile for reproducible builds
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source and build the client bundle (src/client/app.js)
COPY . .
RUN bun run build

# --- Runtime stage: slim image with only what the server needs ---
FROM oven/bun:1-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# App listens on PORT and stores idea .md files in IDEAS_DIR.
# IDEAS_DIR points at /data, which is a mounted volume (see docker-compose.yml)
# so your ideas live on the host and survive image rebuilds.
ENV PORT=3000
ENV IDEAS_DIR=/data

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/src ./src

# Data directory (the app also self-creates it + a default categories.yaml on start)
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

CMD ["bun", "src/server/index.ts"]
