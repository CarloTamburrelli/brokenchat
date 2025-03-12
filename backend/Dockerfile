# Usa un'immagine di Node.js come base
FROM node:16

# Imposta la cartella di lavoro
WORKDIR /app

# Copia i file package.json e package-lock.json
COPY package*.json ./

# Installa le dipendenze
RUN npm install

RUN npm install -g nodemon

# Copia tutto il codice dell'app nella cartella di lavoro
COPY . .

# Espone la porta 5000
EXPOSE 5002

# Avvia il server
CMD ["npm", "start"]
