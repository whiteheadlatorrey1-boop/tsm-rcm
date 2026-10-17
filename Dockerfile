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
# Commit this image was built from -- pass with --build-arg GIT_SHA=$(git rev-parse HEAD).
# Defaults to "unknown" so a build without the arg (e.g. a local `docker build`) doesn't
# lie about what it's running. Exposed at runtime via GET /health.
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA
EXPOSE 8080
