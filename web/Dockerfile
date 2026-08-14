FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -g npm@11 && npm ci

FROM deps AS migrate
COPY . .
CMD ["npx", "drizzle-kit", "migrate"]

FROM deps AS web-dev
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["npx", "next", "dev", "--hostname", "0.0.0.0", "--port", "3000"]

FROM deps AS web
COPY . .
ARG DATABASE_URL
ARG DATABASE_URL_UNPOOLED
ARG NEON_AUTH_BASE_URL
ARG NEON_AUTH_COOKIE_SECRET
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["npx", "next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
