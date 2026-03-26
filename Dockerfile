FROM node:24-slim

WORKDIR /app

# Zależności — kopiujemy tylko package*.json żeby cache warstwy działał
COPY package.json package-lock.json ./
RUN npm ci

# Kod mapowany przez volume — nie kopiujemy
# COPY . .

EXPOSE 3000

CMD ["npx", "next", "dev", "-p", "3000", "-H", "0.0.0.0"]
