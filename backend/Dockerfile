
FROM node:20-alpine

# Set the application directory
WORKDIR /app

# Copy package metadata and install production dependencies
COPY package.json ./

RUN npm install --force
# Copy the backend source code
COPY . .

# Express application port (change if server.js uses another port)
EXPOSE 5000

# Start the backend
CMD ["npm", "start"]

