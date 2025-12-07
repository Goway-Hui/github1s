# Use Node.js 20 as the base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy all files (including node_modules if they exist locally)
COPY . .

# Remove husky from postinstall script to avoid "husky: not found" error
# caused by incompatible Windows binaries or missing husky in global path
RUN sed -i 's/husky install && //g' package.json

# Install git to avoid commit ID fallback delays
RUN apt-get update && apt-get install -y git

# Install dependencies
# We use npm install to ensure all dependencies (including native ones) are built for Linux
RUN npm install

# Build the application
RUN npm run build

# Expose the port
EXPOSE 4000

# Start the server
CMD ["node", "server.js"]
