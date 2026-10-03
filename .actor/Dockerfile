FROM apify/actor-node-playwright-chrome:22 AS builder

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --include=dev
COPY . ./
RUN npm run build

FROM apify/actor-node-playwright-chrome:22

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /usr/src/app/dist ./dist
CMD ["node", "dist/main.js"]
