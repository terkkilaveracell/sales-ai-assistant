FROM node:20-slim

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm ci

COPY src/ ./
COPY tsconfig.json .

EXPOSE 3000

CMD ["npm", "run", "start"]