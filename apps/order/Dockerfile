# syntax=docker/dockerfile:1
# Se construye desde la raíz del monorepo: docker build -f apps/order/Dockerfile .

FROM node:20-alpine AS deps
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM deps AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY libs libs
COPY apps/order apps/order
RUN npx nest build order

FROM node:20-alpine AS runtime
ENV NODE_ENV=production TZ=America/Tegucigalpa
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /usr/src/app/dist/apps/order ./dist
USER node
EXPOSE 3003
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s CMD wget -qO- http://127.0.0.1:${PORT:-3003}/health || exit 1
CMD ["node", "dist/main.js"]
