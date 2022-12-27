# syntax=docker/dockerfile:1

FROM node:18-alpine AS build-js
RUN mkdir /build
WORKDIR /build
COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --frozen-lockfile
COPY public/ public/
COPY src/ src/
RUN yarn build

FROM python:3.10 AS build-py
RUN pip install -U pip && pip install poetry
COPY pyproject.toml ./pyproject.toml
COPY poetry.lock ./poetry.lock
RUN poetry export -o requirements.txt

FROM srittau/uvicorn:3.10
WORKDIR /app
RUN mkdir /app/data
COPY --from=build-js /build/build/ /app/www-data/
COPY ./schema.graphql ./db/schema.sql /app/
COPY --from=build-py requirements.txt /app/requirements.txt
RUN /app/virtualenv/bin/pip install -U pip && /app/virtualenv/bin/pip install -r /app/requirements.txt
COPY ./pylibs/hej/ /app/hej/

ENV HEJ_GQL_SCHEMA_PATH=/app/schema.graphql \
    HEJ_DB_SCHEMA_PATH=/app/schema.sql \
    HEJ_DB_PATH=/app/data/hej.sqlite \
    HEJ_STATIC_PATH=/app/www-data
CMD ["hej.app:app"]
