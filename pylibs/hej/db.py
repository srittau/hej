from __future__ import annotations

import datetime
import logging
import os
import shutil
import time
from collections.abc import AsyncGenerator, AsyncIterable, Generator, Iterable
from contextlib import asynccontextmanager, contextmanager
from pathlib import Path
from sqlite3.dbapi2 import Row
from types import TracebackType
from typing import Any, LiteralString
from uuid import UUID, uuid4

import aiosqlite
from aiosqlite import Connection
from dbupgrade import MAX_API_LEVEL, MAX_VERSION, VersionInfo, db_upgrade
from dbupgrade.result import UpgradeResult

from hej.colors import Color, validate_rgb_color
from hej.exc import DBMigrationError, DuplicateItemError, UnknownItemError
from hej.label import Label
from hej.note import Note

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
    return datetime.datetime.fromisoformat(s[:-1]).replace(tzinfo=datetime.UTC)


class _ConnectionBase:
    @property
    def db(self) -> Connection:
        raise NotImplementedError()

    async def execute(
        self, query: LiteralString, parameters: Iterable[Any] | None = None
    ) -> int:
        async with await self.db.execute(query, parameters) as c:
            return c.rowcount  # type: ignore

    async def execute_fetchall(
        self, query: LiteralString, parameters: Iterable[Any] | None = None
    ) -> AsyncIterable[Row]:
        async with self.db.execute(query, parameters) as c:
            async for row in c:
                yield row

    async def execute_fetchone(
        self,
        table: str,
        id: object,
        query: LiteralString,
        parameters: Iterable[Any] | None = None,
    ) -> Row:
        async with self.db.execute(query, parameters) as c:
            row = await c.fetchone()
            if row is None:
                raise UnknownItemError(table, id)
            return row

    async def row_exists(
        self, query: LiteralString, parameters: Iterable[Any]
    ) -> bool:
        async for _ in self.execute_fetchall(query, parameters):
            return True
        return False


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
        self._db = await aiosqlite.connect(self.db_name, uri=True)
        self._db.row_factory = aiosqlite.Row
        await self._db.execute("PRAGMA foreign_keys = ON")
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
async def open_db(db_name: str) -> AsyncGenerator[Database]:
    async with Database(db_name) as db:
        yield db


@asynccontextmanager
async def open_transaction(db_name: str) -> AsyncGenerator[Transaction]:
    async with open_db(db_name) as db:
        async with db.begin() as t:
            yield t


MIGRATE_LOCK = Path("/tmp/hej.migrate.lock")


@contextmanager
def migrate_lock() -> Generator[None]:
    while True:
        try:
            with MIGRATE_LOCK.open("x"):
                pass
            break
        except FileExistsError:
            time.sleep(0.1)
    try:
        yield
    finally:
        MIGRATE_LOCK.unlink()


def migrate_db() -> None:
    with migrate_lock():
        path = db_path()
        path.touch()
        new_path = path.parent / f"{path.name}.{os.getpid()}"
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


async def select_all_labels(db: _ConnectionBase) -> list[Label]:
    rows = db.execute_fetchall("SELECT * FROM labels")
    return [_label_from_db(row) async for row in rows]


async def select_favorited_labels(db: _ConnectionBase) -> list[Label]:
    rows = db.execute_fetchall("SELECT * FROM labels WHERE favorite")
    return [_label_from_db(row) async for row in rows]


async def select_label_by_uuid(db: _ConnectionBase, uuid: UUID) -> Label:
    row = await db.execute_fetchone(
        "labels", uuid, "SELECT * FROM labels WHERE uuid = ?", [str(uuid)]
    )
    return _label_from_db(row)


async def select_labels_by_note(
    db: _ConnectionBase,
) -> dict[UUID, list[Label]]:
    """Return the labels of all notes, keyed by note UUID.

    Notes without labels are not included.
    """
    rows = db.execute_fetchall(
        "SELECT note_labels.note_uuid, labels.* FROM note_labels "
        "JOIN labels ON labels.uuid = note_labels.label_uuid"
    )
    labels: dict[UUID, list[Label]] = {}
    async for row in rows:
        note_uuid = UUID(row["note_uuid"])
        labels.setdefault(note_uuid, []).append(_label_from_db(row))
    return labels


async def select_label_by_slug(db: _ConnectionBase, slug: str) -> Label:
    row = await db.execute_fetchone(
        "labels", slug, "SELECT * FROM labels WHERE slug = ?", [slug]
    )
    return _label_from_db(row)


async def insert_label(
    db: _ConnectionBase,
    name: str,
    base_slug: str,
    color: Color,
    favorite: bool = False,
) -> Label:
    """Insert a new label.

    The name must already be normalized. The label's slug is `base_slug`,
    with a numeric suffix appended if that slug is already taken. Raise
    DuplicateItemError if a label with the same name (ignoring case)
    already exists.
    """
    if await db.row_exists("SELECT 1 FROM labels WHERE name = ?", [name]):
        raise DuplicateItemError("labels", name)
    slug = await _unique_label_slug(db, base_slug)
    uuid = uuid4()
    await db.execute(
        "INSERT INTO labels(uuid, name, slug, color, favorite) "
        "VALUES(?, ?, ?, ?, ?)",
        [str(uuid), name, slug, color, favorite],
    )
    return Label(uuid, name, slug, color, favorite)


async def update_label(
    db: _ConnectionBase,
    uuid: UUID,
    *,
    name: str | None = None,
    base_slug: str | None = None,
    color: Color | None = None,
    favorite: bool | None = None,
) -> Label:
    """Update a label.

    `name` and `base_slug` must be given together. The name must already
    be normalized. The label's new slug is `base_slug`, with a numeric
    suffix appended if that slug is already used by another label. Raise
    UnknownItemError if the label does not exist and DuplicateItemError if
    another label with the same name (ignoring case) already exists.
    """
    assert (name is None) == (base_slug is None)
    label = await select_label_by_uuid(db, uuid)
    if name is not None and base_slug is not None:
        if await db.row_exists(
            "SELECT 1 FROM labels WHERE name = ? AND uuid != ?",
            [name, str(uuid)],
        ):
            raise DuplicateItemError("labels", name)
        label.name = name
        label.slug = await _unique_label_slug(db, base_slug, exclude=uuid)
    if color is not None:
        label.color = color
    if favorite is not None:
        label.favorite = favorite
    await db.execute(
        "UPDATE labels SET name = ?, slug = ?, color = ?, favorite = ? "
        "WHERE uuid = ?",
        [label.name, label.slug, label.color, label.favorite, str(uuid)],
    )
    return label


async def delete_label(db: _ConnectionBase, uuid: UUID) -> None:
    """Delete a label and remove it from all notes.

    Raise UnknownItemError if the label does not exist.
    """
    rowcount = await db.execute(
        "DELETE FROM labels WHERE uuid = ?", [str(uuid)]
    )
    if rowcount == 0:
        raise UnknownItemError("labels", uuid)


async def attach_note_label(
    db: _ConnectionBase, note_uuid: UUID, label_uuid: UUID
) -> None:
    """Attach a label to a note and update the note's last-changed date.

    Do nothing if the label is already attached to the note. Raise
    UnknownItemError if the note or the label does not exist.
    """
    await select_note(db, note_uuid)
    await select_label_by_uuid(db, label_uuid)
    rowcount = await db.execute(
        "INSERT OR IGNORE INTO note_labels(note_uuid, label_uuid) "
        "VALUES(?, ?)",
        [str(note_uuid), str(label_uuid)],
    )
    if rowcount > 0:
        await _touch_note(db, note_uuid)


async def detach_note_label(
    db: _ConnectionBase, note_uuid: UUID, label_uuid: UUID
) -> None:
    """Detach a label from a note and update the note's last-changed date.

    Do nothing if the label is not attached to the note. Raise
    UnknownItemError if the note or the label does not exist.
    """
    await select_note(db, note_uuid)
    await select_label_by_uuid(db, label_uuid)
    rowcount = await db.execute(
        "DELETE FROM note_labels WHERE note_uuid = ? AND label_uuid = ?",
        [str(note_uuid), str(label_uuid)],
    )
    if rowcount > 0:
        await _touch_note(db, note_uuid)


async def _touch_note(db: _ConnectionBase, uuid: UUID) -> None:
    """Set the last-changed date of a note to now."""
    now = datetime.datetime.now(datetime.UTC)
    await db.execute(
        "UPDATE notes SET last_changed = ? WHERE uuid = ?",
        [db_datetime_old(now), str(uuid)],
    )


async def _unique_label_slug(
    db: _ConnectionBase, base: str, *, exclude: UUID | None = None
) -> str:
    """Return `base`, or `base` with a numeric suffix if it's taken.

    Slugs of the label with the UUID `exclude` are not considered taken.
    """
    exclude_s = str(exclude) if exclude is not None else ""
    slug = base
    n = 2
    while await db.row_exists(
        "SELECT 1 FROM labels WHERE slug = ? AND uuid != ?", [slug, exclude_s]
    ):
        slug = f"{base}-{n}"
        n += 1
    return slug


async def select_all_notes(db: _ConnectionBase) -> list[Note]:
    rows = db.execute_fetchall("SELECT * FROM notes")
    return [_note_from_db(row) async for row in rows]


async def select_notes_by_label(
    db: _ConnectionBase, label_uuid: UUID
) -> list[Note]:
    rows = db.execute_fetchall(
        "SELECT notes.* FROM notes "
        "JOIN note_labels ON note_labels.note_uuid = notes.uuid "
        "WHERE note_labels.label_uuid = ?",
        [str(label_uuid)],
    )
    return [_note_from_db(row) async for row in rows]


async def select_note(db: _ConnectionBase, uuid: UUID) -> Note:
    row = await db.execute_fetchone(
        "notes",
        uuid,
        "SELECT * FROM notes WHERE uuid = ?",
        [str(uuid)],
    )
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


def _label_from_db(row: Row) -> Label:
    color: str = row["color"]
    validate_rgb_color(color)
    return Label(
        UUID(row["uuid"]),
        row["name"],
        row["slug"],
        Color(color),
        bool(row["favorite"]),
    )


def _note_from_db(row: Row) -> Note:
    return Note(
        UUID(row["uuid"]),
        row["title"],
        row["text"],
        bool(row["favorite"]),
        datetime_from_db(row["creation_date"]),
        datetime_from_db(row["last_changed"]),
    )
