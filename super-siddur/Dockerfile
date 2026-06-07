# The Super Siddur — single-stage Node image (no build step; vanilla frontend).
FROM node:20-alpine

WORKDIR /app

# Install server deps first for better layer caching.
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev

# App code.
COPY server ./server
COPY public ./public

# content.json lives here; mount a volume to persist admin edits across deploys.
RUN mkdir -p /app/data
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/app/data

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=4s --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

CMD ["node", "server/server.js"]
