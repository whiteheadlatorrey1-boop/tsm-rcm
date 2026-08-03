FROM node:20-alpine
RUN apk add --no-cache bash
WORKDIR /app
COPY package*.json ./
COPY vendor ./vendor
RUN npm install
ARG CACHE_BUST=2
COPY . .
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
ENV PORT=8080
EXPOSE 8080
