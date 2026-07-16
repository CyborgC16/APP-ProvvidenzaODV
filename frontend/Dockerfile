FROM node:20-alpine AS build
WORKDIR /app
ARG EXPO_PUBLIC_BACKEND_URL
ENV EXPO_PUBLIC_BACKEND_URL=$EXPO_PUBLIC_BACKEND_URL
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx expo export --platform web --output-dir dist

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -q --spider http://127.0.0.1/ || exit 1
