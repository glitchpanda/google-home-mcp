FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY dist ./dist
COPY credentials.json ./

# Create volume for token persistence
VOLUME ["/app/token.json"]

# Expose port
EXPOSE 3000

# Run the server
CMD ["node", "dist/server.js"]