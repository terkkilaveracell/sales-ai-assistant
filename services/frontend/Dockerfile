FROM node:14.16

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY src ./
COPY tsconfig.json .

CMD ["npm","run", "start"]

