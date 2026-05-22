FROM node:20-alpine
WORKDIR /app

ENV PORT=3000
# Disable Next.js telemetry during build/runtime
ENV NEXT_TELEMETRY_DISABLED=1

# Install all dependencies (including devDependencies like typescript)
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Run build
RUN npm run build

EXPOSE 3000

# Set NODE_ENV=production for runtime
ENV NODE_ENV=production

CMD ["npm", "run", "start"]
