# ---------- Base image ----------
FROM node:20-alpine AS base
WORKDIR /app

# ---------- Dependencies layer ----------
FROM base AS deps
COPY package*.json ./
RUN npm ci

# ---------- Build layer ----------
FROM deps AS builder
COPY . .

# Disable telemetry and linting during build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_DISABLE_ESLINT=1

# Build the Next.js app
RUN npm run build

# ---------- Production runner ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only necessary files from builder
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Copy config
COPY --from=builder /app/next.config.ts ./

EXPOSE 4000

CMD ["npm", "start", "--", "-p", "4000"]

