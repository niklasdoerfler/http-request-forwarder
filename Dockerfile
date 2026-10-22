FROM node:24-alpine

# Set app directory as workdir
WORKDIR /usr/src/app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Bundle app source
COPY . .

# Run Project
CMD ["node", "app.js"]
