FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Node 22.18+ exécute le TS nativement ; flag gardé no-op pour compat 22.6–22.17.
CMD ["node", "--experimental-strip-types", "src/game/main.ts"]
EXPOSE 3000
