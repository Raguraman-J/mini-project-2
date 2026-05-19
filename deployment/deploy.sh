#!/bin/bash
echo "Deploying application..."

# Pull latest changes (assuming git repo is cloned on the server)
# git pull origin main

# Build and start the containers in detached mode
docker-compose -f docker-compose.prod.yml up --build -d

echo "Deployment successful! Containers are running."
