# Stage 1: Build the Vite React app
FROM node:20-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Pass backend URL at build time if needed
# ENV VITE_API_URL=http://localhost:5000

RUN npm run build

# Stage 2: Serve the built static files using Nginx
FROM nginx:alpine

# Copy the built app to the Nginx html folder
COPY --from=build /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
