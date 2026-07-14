FROM node:20-bookworm-slim AS build

WORKDIR /app

# Copiamo prima il manifest per sfruttare la cache Docker.
COPY package.json ./

# Gli script di installazione generati da Emergent non sono necessari alla build.
# --ignore-scripts impedisce l'esecuzione di hook non affidabili/ambientali.
RUN npm install --legacy-peer-deps --ignore-scripts --no-audit --no-fund

COPY . .

ARG EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
ENV EXPO_PUBLIC_BACKEND_URL=${EXPO_PUBLIC_BACKEND_URL}
ENV CI=1
ENV NODE_ENV=production

RUN npm run build:web

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
