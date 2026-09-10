# Stage 1: Build
FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

COPY tsconfig.json ./
COPY src ./src

RUN bun build src/index.ts --target bun --outfile dist/index.js --minify

# Stage 2: Runtime
FROM oven/bun:latest AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN chown -R bun:bun /app

USER bun

COPY --from=builder --chown=bun:bun /app/dist/index.js /app/dist/index.js

ENTRYPOINT ["bun", "run", "/app/dist/index.js"]
