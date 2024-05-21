import datetime
from collections.abc import AsyncGenerator, Mapping, Sequence
from pathlib import Path
from sqlite3 import Row
from typing import Any, LiteralString
from uuid import UUID

import aiofiles
import pytest

from .db import Database, Transaction, db_datetime, db_datetime_old, open_db

SCHEMA_PATH = Path(__file__).parent.parent.parent / "db" / "schema.sql"


class DatabaseFixture:
    def __init__(self, db: Database) -> None:
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
        favorite: bool = False,
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
                "favorite": favorite,
                "creation_date": db_datetime(creation_date),
                "last_changed": db_datetime_old(last_changed),
            },
        )
        return uuid

    async def select_all_rows(self, table_name: LiteralString) -> list[Row]:
        rows_iter = self.db.execute_fetchall(f"SELECT * FROM {table_name}")
        return [row async for row in rows_iter]

    async def select_only_row(self, table_name: LiteralString) -> Row:
        rows = await self.select_all_rows(table_name)
        if len(rows) == 0:
            raise AssertionError(f"No rows in table {table_name}")
        elif len(rows) > 1:
            raise AssertionError(f"Multiple rows in table {table_name}")
        else:
            return rows[0]

    async def assert_only_row_equals(
        self, table_name: LiteralString, expected_row: Mapping[str, Any]
    ) -> None:
        row = await self.select_only_row(table_name)
        for k, v in expected_row.items():
            dv = _sql_value(v)
            assert (
                row[k] == dv
            ), f"Row {k} does not match: {dv!r} != {row[k]!r}"

    async def assert_rows_equal(
        self,
        table_name: LiteralString,
        expected_rows: Sequence[Mapping[str, Any]],
    ) -> None:
        rows = [*await self.select_all_rows(table_name)]
        assert len(rows) == len(
            expected_rows
        ), f"Row count does not match: {len(expected_rows)} != {len(rows)}"
        for expected_row in expected_rows:
            for row in rows:
                if row_matches(row, expected_row):
                    rows.remove(row)
                    break
            else:
                raise AssertionError(
                    f"Row {expected_row} not found in {table_name}"
                )

    async def assert_one_row_equals(
        self,
        table_name: LiteralString,
        expected_row: Mapping[str, Any],
    ) -> None:
        rows = [*await self.select_all_rows(table_name)]
        for row in rows:
            if row_matches(row, expected_row):
                return
        raise AssertionError(f"Row {expected_row} not found in {table_name}")


def row_matches(row: Row, expected_row: Mapping[str, Any]) -> bool:
    for k, v in expected_row.items():
        dv = _sql_value(v)
        if row[k] != dv:
            return False
    return True


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
