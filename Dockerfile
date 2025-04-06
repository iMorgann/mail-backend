FROM node:18-slim

# Set the working directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Install pm2 globally
RUN npm install -g pm2

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 5000

# Start both the dev server and worker using pm2
CMD ["pm2-runtime", "start", "npm", "--", "run", "dev:all"]
