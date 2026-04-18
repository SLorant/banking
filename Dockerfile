FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install lightningcss-linux-arm64-musl lightningcss-linux-x64-gnu lightningcss-linux-x64-musl --save-optional

COPY . .

# generate .svelte-kit/tsconfig.json before building
RUN npx svelte-kit sync
RUN npm run build

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "build"]