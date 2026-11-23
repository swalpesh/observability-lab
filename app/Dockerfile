# Start from an official image that already has Node 20 on a tiny Linux (Alpine)
FROM node:20-alpine

# All following commands run inside /app in the image
WORKDIR /app
ENV NODE_ENV=production

# Copy only the dependency files first, then install.
# Docker caches each step (a "layer"): if package.json didn't change,
# the next build skips the slow npm install.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Now copy the source code
COPY src ./src

# Don't run as root inside the container (security best practice)
USER node

# Document which port the app listens on
EXPOSE 8080

# The command that runs when a container starts
CMD ["node", "src/server.js"]