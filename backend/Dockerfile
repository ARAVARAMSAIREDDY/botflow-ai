# ========================================================================
# BotFlow AI Backend - Production Container Image
# ========================================================================
FROM node:20-alpine AS base

# Install curl for container healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Install dependencies first for Docker layer caching
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy application source code
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV PORT=5001

# Create unprivileged user for security compliance
USER node

# Expose internal service port
EXPOSE 5001

# Container healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start production server
CMD ["node", "server.js"]
