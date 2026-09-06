FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY package.json /app/

# Install dependencies
RUN npm install

# Copy source code files
COPY . /app/

EXPOSE 5173

CMD ["npm", "run", "dev"]
