FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# ponytail: CMD placeholder — remplacé par le vrai serveur en P3
CMD ["node", "--version"]
