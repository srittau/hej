# syntax=docker/dockerfile:1

FROM node:24-alpine AS build-js
RUN mkdir /build
WORKDIR /build
COPY package.json yarn.lock tsconfig.json index.html ./
RUN yarn install --frozen-lockfile
COPY public/ public/
COPY src/ src/
RUN yarn build

FROM srittau/uvicorn:3.14

# Prepare directories
WORKDIR /app
RUN mkdir /app/data
ENV UV_PROJECT_ENVIRONMENT=/app/virtualenv

# Install Python dependencies
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
COPY pyproject.toml uv.lock /app/
RUN uv sync --locked --no-dev

# Install app
COPY --from=build-js /build/dist/ /app/www-data/
COPY ./schema.graphql /app/
COPY ./db/versions/ /app/db-versions/
COPY ./pylibs/hej/ /app/hej/

COPY ./logging.yml /app/logging.yml

ENV HEJ_GQL_SCHEMA_PATH=/app/schema.graphql \
    HEJ_DB_SCHEMA_PATH=/app/db-versions \
    HEJ_DB_PATH=/app/data/hej.sqlite \
    HEJ_STATIC_PATH=/app/www-data
CMD ["hej.app:app"]
