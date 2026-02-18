FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN npm install --production && \
    npm cache clean --force

COPY src/ ./src/
COPY data/ ./data/

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "src/index.js"]
