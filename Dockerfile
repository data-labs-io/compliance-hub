# Multi-stage build for optimized production image
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies - Use legacy-peer-deps to handle Next 15 / React 18 conflict
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Build the application
COPY . .
# Ensure we have enough memory and correct flags for the Next.js build
ENV IS_IPF_EXTENSION=true
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV IS_IPF_EXTENSION=true
ENV NODE_TLS_REJECT_UNAUTHORIZED=0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build and static assets
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# IP Fabric Extensions MUST use port 80
EXPOSE 80
ENV PORT=80

CMD ["node", "server.js"]