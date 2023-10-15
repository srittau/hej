import datetime
from collections.abc import Mapping
from pathlib import Path
from sqlite3 import Row
from typing import Any, AsyncGenerator, LiteralString
from uuid import UUID

import aiofiles
import pytest

from .db import Database, Transaction, db_datetime, db_datetime_old, open_db

SCHEMA_PATH = Path(__file__).parent.parent.parent / "db" / "schema.sql"


class DatabaseFixture:
    def __init__(self, db: Database) -> None:  # noqa: F811
        self.db = db

    def begin(self) -> Transaction:
        return self.db.begin()

    async def insert(
        self, table_name: LiteralString, values: Mapping[LiteralString, Any]
    ) -> None:
        """Insert a row into a table."""
        await self.db.execute_commit(
            f"INSERT INTO {table_name}({','.join(values.keys())}) "
            f"VALUES({','.join('?' for _ in values)})",
            [_sql_value(v) for v in values.values()],
        )

    async def insert_note(
        self,
        *,
        uuid: UUID,
        title: str = "",
        text: str = "",
        creation_date: datetime.datetime = datetime.datetime(
            2000, 1, 1, 12, 0, 0
        ),
        last_changed: datetime.datetime = datetime.datetime(
            2000, 1, 1, 12, 0, 0
        ),
    ) -> UUID:
        await self.insert(
            "notes",
            {
                "uuid": str(uuid),
                "title": title,
                "text": text,
                "creation_date": db_datetime(creation_date),
                "last_changed": db_datetime_old(last_changed),
            },
        )
        return uuid

    async def select_only_row(self, table_name: LiteralString) -> Row:
        row = await self.db.execute_fetchone(f"SELECT * FROM {table_name}")
        if row is None:
            raise AssertionError(f"No rows in table {table_name}")
        return row

    async def assert_only_row_equals(
        self, table_name: LiteralString, values: Mapping[str, Any]
    ) -> None:
        row = await self.select_only_row(table_name)
        for k, v in values.items():
            dv = _sql_value(v)
            assert (
                row[k] == dv
            ), f"Row {k} does not match: {dv!r} != {row[k]!r}"


def _sql_value(v: object) -> Any:
    if isinstance(v, UUID):
        return str(v)
    else:
        return v


@pytest.fixture
async def db_o() -> AsyncGenerator[Database, None]:
    async with aiofiles.open(SCHEMA_PATH) as f:
        schema = await f.read()
    async with open_db(":memory:") as db:
        await db.execute_script(schema)
        yield db


@pytest.fixture
async def db() -> AsyncGenerator[DatabaseFixture, None]:
    async with aiofiles.open(SCHEMA_PATH) as f:
        schema = await f.read()
    async with open_db(":memory:") as db:
        await db.execute_script(schema)
        yield DatabaseFixture(db)
