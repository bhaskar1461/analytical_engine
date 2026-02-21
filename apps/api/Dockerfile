FROM node:20-alpine
WORKDIR /app

COPY . .
RUN corepack enable
RUN corepack prepare pnpm@9.15.0 --activate
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @anylical/api build

EXPOSE 4000
CMD ["pnpm", "--filter", "@anylical/api", "start"]
