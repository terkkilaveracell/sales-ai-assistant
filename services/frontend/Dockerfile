FROM node:20-slim

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci

COPY src ./
COPY tsconfig.json .

CMD ["npm","run", "start"]

