# Construction multi-étapes - phase de build
FROM node:18-alpine as builder

# Définir le répertoire de travail
WORKDIR /app

# Accepter l'URL de l'API injectée au moment du build, par défaut pointe vers le service backend dans le conteneur
ARG REACT_APP_API_URL=http://backend:8000
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Copier les fichiers package
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Construire l'application
RUN npm run build

# Phase de production - servir les fichiers statiques avec nginx
FROM nginx:alpine

# Copier le résultat du build vers le répertoire nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Copier la configuration nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Exposer le port
EXPOSE 80

# Démarrer nginx
CMD ["nginx", "-g", "daemon off;"]