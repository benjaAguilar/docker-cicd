FROM node:22

RUN npm install -g corepack@latest
RUN corepack enable pnpm

WORKDIR /home/app
COPY . .

RUN pnpm install

EXPOSE 3000
CMD ["node", "index.js"]
