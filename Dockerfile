FROM node:22

RUN npm install -g corepack@latest
RUN corepack enable pnpm

WORKDIR /home/app
COPY . .

RUN pnpm install
RUN pnpm build

EXPOSE 3000
CMD ["node", "dist/index.js"]
