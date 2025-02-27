# syntax=docker/dockerfile:1

FROM node:22-alpine AS build-js
RUN mkdir /build
WORKDIR /build
COPY package.json yarn.lock tsconfig.json index.html ./
RUN yarn install --frozen-lockfile
COPY public/ public/
COPY src/ src/
RUN yarn build

FROM python:3.12 AS build-py
RUN pip install -U pip && pip install poetry poetry-plugin-export
COPY pyproject.toml ./pyproject.toml
COPY poetry.lock ./poetry.lock
RUN poetry export -o requirements.txt

FROM srittau/uvicorn:3.12
WORKDIR /app
RUN mkdir /app/data
COPY --from=build-js /build/dist/ /app/www-data/
COPY ./schema.graphql /app/
COPY ./db/versions/ /app/db-versions/
COPY --from=build-py requirements.txt /app/requirements.txt
RUN /app/virtualenv/bin/pip install -U pip && /app/virtualenv/bin/pip install -r /app/requirements.txt
COPY ./pylibs/hej/ /app/hej/

COPY ./logging.yml /app/logging.yml

ENV HEJ_GQL_SCHEMA_PATH=/app/schema.graphql \
    HEJ_DB_SCHEMA_PATH=/app/db-versions \
    HEJ_DB_PATH=/app/data/hej.sqlite \
    HEJ_STATIC_PATH=/app/www-data
CMD ["hej.app:app"]
