FROM node:18-alpine

# Set app directory as workdir
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app

# Install deps
RUN npm install

# Run Project
CMD node app.js
