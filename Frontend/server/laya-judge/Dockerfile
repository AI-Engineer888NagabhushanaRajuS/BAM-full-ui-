FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache curl python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 8787

CMD ["node", "--experimental-strip-types", "server.ts"]
