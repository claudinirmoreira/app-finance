# Build stage
FROM node:22-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate && npm run build

# Runtime stage
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Full install (keeps prisma CLI + tsx available for migrate/seed/runtime)
COPY package.json package-lock.json ./
RUN npm ci
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY src ./src
COPY prisma ./prisma

EXPOSE 3333
CMD ["sh", "-c", "NODE_ENV=production npx prisma migrate deploy && NODE_ENV=production npx prisma db seed && NODE_ENV=production npx tsx src/server.ts"]