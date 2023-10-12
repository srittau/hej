## Prerequisites

- Python 3.11+
- Poetry
- Node.js 18+
- yarn

## Preparing the Development Environment

Create a Python virtual environment, activate it, and install dependencies:

```
$ poetry install
$ poetry shell
```

Prepare the JavaScript environment using yarn:

```
$ yarn install --frozen-lockfile
```

## Running the Tests

Running the Python tests and linter, using the activated virtual environment:

```
$ poe test
$ poe lint
$ poe typecheck
```

Running the JavaScript tests:

```
$ yarn test
```

## Running the Test Server

In one terminal, run:

```
$ poetry run poe start
```

In another terminal, run:

```
$ yarn start
```

The user interface can be accessed at http://localhost:5173/ in your browser.
The password is `sikrit`. The GraphQL API can be accessed at
http://localhost:5173/graphql/.

Changes to either the frontend or the backend should be automatically reloaded.

The test database is found at `./test-db/hej.sqlite`.
