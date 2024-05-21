from __future__ import annotations

import datetime
import logging
import os
import shutil
import time
from collections.abc import AsyncGenerator, AsyncIterable, Iterable
from contextlib import asynccontextmanager
from pathlib import Path
from sqlite3.dbapi2 import Row
from types import TracebackType
from typing import Any
from uuid import UUID, uuid4

import aiosqlite
from aiosqlite import Connection
from dbupgrade import MAX_API_LEVEL, MAX_VERSION, VersionInfo, db_upgrade
from dbupgrade.result import UpgradeResult

from .exc import DBMigrationError, UnknownItemError
from .note import Note

LOGGER = logging.getLogger(__name__)


def db_schema_path() -> Path:
    path = os.getenv("HEJ_DB_SCHEMA_PATH")
    if path is not None:
        p = Path(path)
    else:
        p = Path(__file__).parent.parent.parent / "db" / "versions"
    if not p.is_dir():
        raise RuntimeError(f"schema path {p} is not a directory")
    return p


def db_path(database: str | None = None) -> Path:
    if database is not None:
        return Path(database)
    db_path = os.getenv("HEJ_DB_PATH")
    if db_path is not None:
        return Path(db_path)
    return Path.home() / ".hej.sqlite"


def db_url(database: str | None = None) -> str:
    return f"file:{db_path(database)}"


def db_datetime(dt: datetime.datetime) -> str:
    return dt.isoformat()[:19].replace("T", " ")


def db_datetime_old(dt: datetime.datetime) -> str:
    return dt.isoformat()[:19] + "Z"


def datetime_from_db(s: str) -> datetime.datetime:
    if not s.endswith("Z"):
        s += "Z"
    return datetime.datetime.fromisoformat(s[:-1])


class _ConnectionBase:
    @property
    def db(self) -> Connection:
        raise NotImplementedError()

    async def execute(
        self, sql: str, parameters: Iterable[Any] | None = None
    ) -> int:
        async with await self.db.execute(sql, parameters) as c:
            return c.rowcount  # type: ignore

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
    def __init__(self, db_name: str) -> None:
        self.db_name = db_name
        self._db: Connection | None = None

    @property
    def db(self) -> Connection:
        if self._db is None:
            raise RuntimeError("context manager was not entered")
        return self._db

    async def __aenter__(self) -> Database:
        self._db = await aiosqlite.connect(self.db_name)
        self._db.row_factory = aiosqlite.Row
        return self

    async def __aexit__(
        self,
        type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
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

    async def execute_script(self, sql: str) -> None:
        assert self._db is not None
        await self._db.executescript(sql)


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
async def open_db(db_name: str) -> AsyncGenerator[Database, None]:
    async with Database(db_name) as db:
        yield db


@asynccontextmanager
async def open_transaction(db_name: str) -> AsyncGenerator[Transaction, None]:
    async with open_db(db_name) as db:
        async with db.begin() as t:
            yield t


def migrate_db() -> None:
    path = db_path()
    path.touch()
    t = int(time.time())
    new_path = path.parent / f"{path.name}.{t}"
    shutil.copy(path, new_path)
    result = initialize_db(path)
    if not result.success:
        LOGGER.error(
            f"Database migration failed, old database kept as {new_path}"
        )
        raise DBMigrationError("database migration failed")
    if result.old_version.version != result.new_version.version:
        LOGGER.info(
            f"Migrated database from #{result.old_version.version} to "
            f"#{result.new_version.version}"
        )
        LOGGER.info(f"Database backup kept as {new_path}")
    else:
        LOGGER.info("Database is up to date")
        os.remove(new_path)


def initialize_db(db_path: Path) -> UpgradeResult:
    db_url = f"sqlite:///{db_path}"
    version = VersionInfo(MAX_VERSION, MAX_API_LEVEL)
    return db_upgrade("hej", db_url, str(db_schema_path()), version)


async def select_all_notes(db: _ConnectionBase) -> list[Note]:
    rows = db.execute_fetchall("SELECT * FROM notes")
    return [_note_from_db(row) async for row in rows]


async def select_note(db: _ConnectionBase, uuid: UUID) -> Note:
    row = await db.execute_fetchone(
        "SELECT * FROM notes WHERE uuid = ?",
        [str(uuid)],
    )
    if row is None:
        raise UnknownItemError("notes", uuid)
    return _note_from_db(row)


async def insert_note(db: _ConnectionBase, title: str, text: str) -> Note:
    uuid = uuid4()
    dt = datetime.datetime.now(datetime.UTC)
    await db.execute(
        "INSERT INTO notes(uuid, title, text, creation_date, last_changed) "
        "VALUES(?, ?, ?, ?, ?)",
        [str(uuid), title, text, db_datetime(dt), db_datetime_old(dt)],
    )
    return Note(uuid, title, text, False, dt, dt)


async def update_note(
    db: _ConnectionBase,
    uuid: UUID,
    title: str | None = None,
    text: str | None = None,
    *,
    favorite: bool | None = None,
) -> Note:
    old_note = await select_note(db, uuid)
    if title is None and text is None and favorite is None:
        return old_note

    if title is None:
        title = old_note.title
    if text is None:
        text = old_note.text
    if favorite is None:
        favorite = old_note.favorite

    now = datetime.datetime.now(datetime.UTC)

    await db.execute(
        "UPDATE notes SET title = ?, text = ?, favorite = ?, last_changed = ? "
        "WHERE uuid = ?",
        [title, text, favorite, db_datetime_old(now), str(uuid)],
    )
    return await select_note(db, uuid)


async def delete_note(db: _ConnectionBase, uuid: UUID) -> None:
    rowcount = await db.execute(
        "DELETE FROM notes WHERE uuid = ?", [str(uuid)]
    )
    if rowcount == 0:
        raise UnknownItemError("notes", uuid)


def _note_from_db(row: Row) -> Note:
    return Note(
        UUID(row["uuid"]),
        row["title"],
        row["text"],
        bool(row["favorite"]),
        datetime_from_db(row["creation_date"]),
        datetime_from_db(row["last_changed"]),
    )
