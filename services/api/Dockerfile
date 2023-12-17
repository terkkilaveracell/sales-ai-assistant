FROM node:20

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY src/ ./
COPY tsconfig.json .

#RUN npm run build

EXPOSE 3000

#CMD ["node", "dist/index.js"]
CMD ["npm", "run", "start"]