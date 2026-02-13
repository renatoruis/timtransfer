FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./
COPY lib ./lib
COPY scripts ./scripts
COPY public ./public

ENV NODE_ENV=production
ENV PORT=9090

EXPOSE 9090

CMD ["node", "server.js"]
