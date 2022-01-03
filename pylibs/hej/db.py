from __future__ import annotations

import datetime
from collections.abc import Iterable
from contextlib import asynccontextmanager
from pathlib import Path
from sqlite3.dbapi2 import Row
from types import TracebackType
from typing import Any, AsyncGenerator, AsyncIterable
from uuid import UUID, uuid4

import aiofiles
import aiosqlite
from aiosqlite import Connection

from hej.article import Article
from hej.exc import UnknownItemError

_SCHEMA_PATH = Path(__file__).parent.parent.parent / "db" / "schema.sql"


def db_datetime(dt: datetime.datetime) -> str:
    return dt.isoformat()[:19] + "Z"


def datetime_from_db(s: str) -> datetime.datetime:
    assert s.endswith("Z")
    return datetime.datetime.fromisoformat(s[:-1])


class _ConnectionBase:
    @property
    def db(self) -> Connection:
        raise NotImplementedError()

    async def execute(
        self, sql: str, parameters: Iterable[Any] | None = None
    ) -> None:
        await self.db.execute(sql, parameters)

    async def execute_fetchall(
        self, sql: str, parameters: Iterable[Any] | None = None
    ) -> AsyncIterable[Row]:
        async with self.db.execute(sql, parameters) as c:
            async for row in c:
                yield row

    async def execute_fetchone(
        self, sql: str, parameters: Iterable[Any] | None = None
    ) -> Row | None:
        async with self.db.execute(sql, parameters) as c:
            return await c.fetchone()


class Database(_ConnectionBase):
    def __init__(self, dbname: str) -> None:
        self.dbname = dbname
        self._db: Connection | None = None

    @property
    def db(self) -> Connection:
        if self._db is None:
            raise RuntimeError("context manager was not entered")
        return self._db

    async def __aenter__(self) -> Database:
        self._db = await aiosqlite.connect(self.dbname)
        try:
            await self._initialize_db(self._db)
        except:  # noqa E722
            await self._db.close()
            raise
        return self

    async def _initialize_db(self, db: Connection) -> None:
        async with db.execute("SELECT COUNT(*) FROM sqlite_master") as c:
            count = await c.fetchone()
            assert count is not None
        if count[0] > 0:
            return
        async with aiofiles.open(_SCHEMA_PATH) as f:
            sql = await f.read()
        await db.executescript(sql)

    async def __aexit__(
        self,
        type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType,
    ) -> None:
        if self._db:
            await self._db.close()

    def begin(self) -> Transaction:
        return Transaction(self.db)

    async def execute_commit(
        self, sql: str, parameters: Iterable[Any] | None = None
    ) -> None:
        async with self.begin() as t:
            await t.db.execute(sql, parameters)


class Transaction(_ConnectionBase):
    def __init__(self, db: Connection) -> None:
        self._db = db

    @property
    def db(self) -> Connection:
        return self._db

    async def __aenter__(self) -> Transaction:
        return self

    async def __aexit__(
        self,
        type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType,
    ) -> None:
        if type is None:
            await self.db.commit()
        else:
            await self.db.rollback()


@asynccontextmanager
async def open_db(dbname: str) -> AsyncGenerator[Database, None]:
    async with Database(dbname) as db:
        yield db


@asynccontextmanager
async def open_transaction(
    dbname: str,
) -> AsyncGenerator[Transaction, None]:
    async with open_db(dbname) as db:
        async with db.begin() as t:
            yield t


async def select_all_articles(db: _ConnectionBase) -> list[Article]:
    rows = db.execute_fetchall(
        "SELECT uuid, title, text, last_changed FROM articles"
    )
    return [_article_from_db(row) async for row in rows]


async def select_article(db: _ConnectionBase, uuid: UUID) -> Article:
    row = await db.execute_fetchone(
        "SELECT uuid, title, text, last_changed FROM articles "
        "WHERE uuid = ?",
        [str(uuid)],
    )
    if row is None:
        raise UnknownItemError("articles", uuid)
    return _article_from_db(row)


async def insert_article(
    db: _ConnectionBase, title: str, text: str
) -> Article:
    uuid = uuid4()
    dt = datetime.datetime.utcnow()
    await db.execute(
        "INSERT INTO articles(uuid, title, text, last_changed) "
        "VALUES(?, ?, ?, ?)",
        [str(uuid), title, text, db_datetime(dt)],
    )
    return Article(uuid, title, text, dt)


async def update_article(
    db: _ConnectionBase, uuid: UUID, title: str, text: str
) -> Article:
    dt = datetime.datetime.utcnow()
    async with db.db.execute(
        "UPDATE articles SET title = ?, text = ?, last_changed = ? "
        "WHERE uuid = ?",
        [title, text, db_datetime(dt), str(uuid)],
    ) as c:
        if c.rowcount == 0:
            raise UnknownItemError("articles", uuid)
    return Article(uuid, title, text, dt)


async def delete_article(db: _ConnectionBase, uuid: UUID) -> None:
    async with db.db.execute(
        "DELETE FROM articles WHERE uuid = ?", [str(uuid)]
    ) as c:
        if c.rowcount == 0:
            raise UnknownItemError("articles", uuid)


def _article_from_db(row: Row) -> Article:
    uuid_s, title, text, dt_str = row
    return Article(UUID(uuid_s), title, text, datetime_from_db(dt_str))