# Backend Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy shared types
COPY ../shared /app/shared

# Copy backend source
COPY . .

# Expose backend port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
