# syntax=docker/dockerfile:1

FROM node:16-alpine
RUN mkdir /build
WORKDIR /build
COPY package.json yarn.lock tsconfig.json ./
RUN yarn install --frozen-lockfile
COPY public/ public/
COPY src/ src/
RUN yarn build

FROM srittau/uvicorn:3.10
WORKDIR /app
RUN mkdir /app/data
COPY --from=0 /build/build/ /app/www-data/
COPY ./schema.graphql ./db/schema.sql /app/
COPY ./pylibs/hej/ /app/hej/

ENV HEJ_GQL_SCHEMA_PATH=/app/schema.graphql \
    HEJ_DB_SCHEMA_PATH=/app/schema.sql \
    HEJ_DB_PATH=/app/data/hej.sqlite \
    HEJ_STATIC_PATH=/app/www-data
CMD ["hej.app:app"]
