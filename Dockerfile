FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install @sveltejs/adapter-node

COPY . .

# generate .svelte-kit/tsconfig.json before building
RUN npx svelte-kit sync
RUN npm run build

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "build"]