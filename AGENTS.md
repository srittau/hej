# Coding Agent Instructions for hej, a Personal Wiki

## Project Overview

hej is a simple, single-user, browser-based personal wiki. Notes have a
title, a Markdown text, a favorite flag, and creation/last-changed
timestamps.

- **Backend:** Python 3.14+, Starlette ASGI app served by uvicorn, GraphQL
  API via Ariadne (schema-first), SQLite via aiosqlite, migrations via
  dbupgrade. Also provides a small Click CLI.
- **Frontend:** React 19 + TypeScript single-page app built with Vite,
  using Mantine (UI), TanStack Query (data fetching/caching), React Router,
  awesome-graphql-client, react-markdown, and Font Awesome icons.
- **Deployment:** A multi-stage `Dockerfile` builds the frontend and
  bundles it with the backend; CI publishes the image to
  `ghcr.io/srittau/hej` on pushes to `main`.

## Repository Layout

```
pylibs/hej/          Python backend package (flat; tests live alongside code)
  app.py             Starlette app: mounts /graphql, serves static frontend
  gql.py             Ariadne resolvers and schema binding
  db.py              DB connection/transaction helpers, queries, migrations
  auth.py            Session-key authentication (HejSessionKey cookie)
  cli.py             Click CLI (`python -m hej`): create/update/list/view/delete
  note.py            `Note` dataclass
  exc.py             Exception hierarchy (`HejError` and subclasses)
  debug.py           HEJ_DEBUG flag
  test_*.py          pytest tests
  testutil_*.py      Shared test fixtures (DB and GraphQL helpers)
src/                 React/TypeScript frontend
  gql.ts             All GraphQL queries/mutations and TanStack Query hooks
  Router.tsx         Routes, loaders, and actions
  auth.ts            Session cookie helpers
  *.module.css       CSS modules per component
schema.graphql       GraphQL schema (source of truth for the API)
db/versions/         Numbered SQL migration scripts for dbupgrade
db/schema.sql        Current full DB schema (used by Python tests)
public/              Static assets copied into the frontend build
test-db/             Location of the local development database
```

## Development Commands

Setup (see `CONTRIBUTING.md`):

```sh
uv sync
pnpm install --frozen-lockfile
```

Python (run via `uv run` or inside the activated `.venv`):

```sh
uv run poe test        # pytest
uv run poe lint        # ruff check pylibs
uv run poe typecheck   # mypy pylibs (strict)
uv run poe format      # ruff format pylibs
uv run poe format-check  # check formatting without changing files
uv run poe start       # dev backend on :8000 with auto-reload
```

JavaScript/TypeScript:

```sh
pnpm run test:ci       # vitest, single run (browser mode, Chromium via Playwright)
pnpm run lint          # eslint src
pnpm run format        # format src with prettier
pnpm run format:check  # check formatting without changing files
pnpm run build         # tsc type check + vite build into dist/
pnpm run start         # vite dev server on :5173, proxies /graphql to :8000
```

Do not use `pnpm run test`; it starts vitest in watch mode and never exits.
Frontend tests need a Playwright Chromium install
(`pnpm exec playwright install chromium`).

The dev backend uses the password `sikrit` and the database at
`test-db/hej.sqlite`.

Before finishing a change, run the checks CI runs for the side you
touched: `typecheck`, `lint`, `format-check`, and `test` for Python;
`lint`, `format:check`, and `test:ci` for the frontend.

## Coding Conventions

### Python

- Line length is **79** characters. Format with `poe format` (ruff); lint
  rules are configured in `pyproject.toml`.
- Imports are sorted by ruff/isort with a dedicated `hej` section after
  third-party imports, and `combine-as-imports`. Within the package, both
  `from .module import ...` and `from hej.module import ...` are used.
- mypy runs in strict mode (`disallow_untyped_defs`,
  `disallow_any_generics`, `warn_return_any`, etc.). Every function needs
  full type annotations. Use modern syntax (`X | None`, PEP 695 generics,
  `collections.abc` types).
- All database and resolver code is `async`. Use
  `async with open_transaction(db_url()) as db:` for DB access; the
  transaction commits on success and rolls back on exceptions.
- Use parameterized SQL (`?` placeholders); never interpolate values.
- All datetimes must be timezone-aware UTC. `Note.__post_init__` enforces
  this. Note the two DB datetime formats: `creation_date` uses
  `db_datetime()` (`YYYY-MM-DD HH:MM:SS`), `last_changed` uses
  `db_datetime_old()` (`YYYY-MM-DDTHH:MM:SSZ`).
- Raise `UnknownItemError` from DB functions for missing rows. Resolvers
  translate that into the documented GraphQL result (`null`, `false`, or
  an empty list), not an error.
- Configuration is read from `HEJ_*` environment variables
  (`HEJ_SESSION_KEY`, `HEJ_DB_PATH`, `HEJ_DB_SCHEMA_PATH`,
  `HEJ_GQL_SCHEMA_PATH`, `HEJ_STATIC_PATH`, `HEJ_DEBUG`).

### TypeScript / React

- Prettier with 2-space indentation (4 for CSS). ESLint uses the
  type-checked typescript-eslint config plus react, react-hooks, and
  jsx-a11y.
- One component per file, exported as `export default function Name()`.
  Component-specific styles go in a matching `Name.module.css`.
- Import order: third-party packages first, a blank line, then local
  imports, each group alphabetized.
- All GraphQL access goes through `src/gql.ts`. Define queries with the
  `gql` tag, reuse `NoteFragment`/`NoteMetaFragment`, add typed
  request/response interfaces, and invalidate or update the
  `["notes", ...]` query keys after mutations.
- Route-level data loading uses React Router loaders wrapped in
  `privateLoader()` (redirects to `/login` when unauthenticated).

### Tests

- Python tests live next to the code as `pylibs/hej/test_*.py` and use
  pytest with `asyncio_mode = "auto"` (no `@pytest.mark.asyncio` needed).
  Related tests are often grouped in `Test*` classes. Use the fixtures from
  `testutil_db.py` and `testutil_gql.py`; `test_integration.py` shows how to
  exercise GraphQL end-to-end against an in-memory database.
- Test new backend features primarily through GraphQL in
  `test_integration.py`. Integration tests must reach every resolver code
  path and exercise every argument and return field, but need not cover
  every permutation of the underlying logic. Add separate unit tests only
  for:
  - complex database queries,
  - logic with many permutations that would be inefficient to test
    through the API,
  - stand-alone business logic and utility functions.

  For straightforward logic, prefer integration tests over extra unit
  tests, especially ones relying on mocks or spies. Older code has
  separate `test_db.py` tests; don't take that as the pattern to follow.

- Frontend tests are `src/*.test.ts(x)` run by vitest in browser mode.
  `src/setupTests.ts` and `src/graphql-request.mock.ts` hold shared setup.

## Common Change Patterns

### Changing the database schema

1. Add a new migration `db/versions/NNNN-short-description.sql` with the
   next sequential number and the dbupgrade header:
   ```sql
   -- Schema: hej
   -- Dialect: sqlite
   -- Version: N
   -- API-Level: 1
   ```
2. Update `db/schema.sql` to the resulting full schema. Python tests build
   their database from this file, not from the migrations.
3. Update `Note` in `note.py`, `_note_from_db()` and the queries in `db.py`,
   and `DatabaseFixture` in `testutil_db.py` as needed.

Never edit an existing migration; it may already have run on deployed
databases. Migrations run automatically at app startup (`migrate_db()`),
which keeps a backup copy of the database whenever it migrates.

### Changing the GraphQL API

1. Edit `schema.graphql`. Document every field and argument with a
   docstring, including what is returned for invalid input.
2. Implement the resolver in `gql.py`. Names are converted automatically
   between camelCase (GraphQL) and snake_case (Python). Decorate every
   resolver except `login` with `@require_auth`.
3. Add tests in `test_integration.py`.
4. Update `src/gql.ts` and the TypeScript types in `src/Note.ts`.

## Dependencies

- Python dependencies are declared in `pyproject.toml` and locked in
  `uv.lock`; manage them with `uv`. `requirements.txt` exists only for the
  Docker base image; don't add dependencies there.
- JavaScript dependencies are managed with pnpm (`package.json`,
  `pnpm-lock.yaml`).
- Both uv and pnpm are configured to ignore releases newer than 5 days.
- Dependabot opens most dependency update PRs.
