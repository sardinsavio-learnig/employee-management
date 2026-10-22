
FROM node:22-alpine

WORKDIR /app

# Copy package manifest
COPY package.json ./

# Install dependencies (your project currently has no package-lock.json)
RUN npm install

# Copy frontend source
COPY . .

# Build the Vite application
RUN npm run build

# Vite preview server port
EXPOSE 4173

# Serve the production build
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]

