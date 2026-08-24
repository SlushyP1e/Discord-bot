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
    DATA_DIR=/app/data \
    HEALTH_PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME /app/data

# Liveness: the /healthz endpoint above must answer. `restart: unless-stopped`
# alone can't detect a hung process; this lets Docker (and NAS UIs) do it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.HEALTH_PORT??'3000')+'/healthz').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status)}).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
