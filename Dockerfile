FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# create a dir for your sqlite db so it survives rebuilds
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "build"]