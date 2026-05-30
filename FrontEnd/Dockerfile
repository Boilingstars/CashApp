# Сборка SPA для раздачи через nginx в CashApp
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Артефакт: /app/dist → копируется в volume сервисом frontend (CashApp/docker-compose.yml)
CMD ["sh", "-c", "cp -r /app/dist/. /output/"]
