# --- build du bundle web Expo ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx expo export --platform web

# --- serveur node (static + proxy /api) ---
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.js ./
ENV PORT=3000
ENV API_TARGET=http://api:8080
EXPOSE 3000
CMD ["node", "server.js"]
