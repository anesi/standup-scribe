# Use Node.js 20 LTS Alpine for smaller image size
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy rest of application
COPY . .

# Build TypeScript
RUN npm run build

# Run database migrations on startup
RUN npx prisma generate

# Expose port (CapRover uses this for health checks)
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
