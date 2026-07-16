# ---- Build stage: install deps (better-sqlite3 may compile from source) ----
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Runtime stage: small, non-root ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    DATA_DIR=/app/data

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME /app/data

CMD ["node", "src/index.js"]
