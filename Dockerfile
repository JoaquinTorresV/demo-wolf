FROM node:22-alpine

WORKDIR /app

# Instalar dependencias primero (mejor cacheo de capas).
COPY package*.json ./
RUN npm install --omit=dev

# Copiar el resto del código.
COPY . .

# Carpeta de datos (montar como volumen persistente en EasyPanel: /app/data).
RUN mkdir -p /app/data
ENV SQLITE_PATH=/app/data/wolf.db

EXPOSE 3000

# node:sqlite necesita el flag experimental en Node 22.
CMD ["node", "--experimental-sqlite", "src/index.js"]
