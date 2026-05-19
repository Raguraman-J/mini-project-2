FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Environment variables should be passed during runtime via docker-compose or .env
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]
