FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate && npm prune --omit=dev

COPY src ./src

USER node
EXPOSE 5000
CMD ["node", "src/server.js"]
