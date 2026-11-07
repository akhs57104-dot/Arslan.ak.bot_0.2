FROM node:20-bullseye

# System dependencies (ffmpeg is required for media conversion)
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        git \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json ./
RUN npm install --omit=dev || npm install

# Copy the application source
COPY . .

# PM2 for process management
RUN npm install -g pm2

EXPOSE 9090

CMD ["node", "index.js"]
