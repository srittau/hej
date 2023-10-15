from __future__ import annotations

import datetime
from pathlib import Path
from typing import AsyncGenerator
from uuid import UUID

import aiofiles
import pytest

from .db import (
    Database,
    db_datetime,
    db_datetime_old,
    delete_note,
    insert_note,
    open_db,
    open_transaction,
    select_all_notes,
    select_note,
    update_note,
)
from .exc import UnknownItemError
from .note import Note

_UUID = UUID("7bb570bf-2e21-4baf-b963-23c454e052ab")
_UUID2 = UUID("dd877ebd-a9cf-466d-99f2-1327e2068ff2")


@pytest.fixture
async def db() -> AsyncGenerator[Database, None]:  # type: ignore[misc]
    async with aiofiles.open(
        Path(__file__).parent.parent.parent / "db" / "schema.sql"
    ) as f:
        schema = await f.read()
    async with open_db(":memory:") as db:
        await db.execute_script(schema)
        yield db


async def test_open_transaction() -> None:
    async with open_transaction(":memory:") as t:
        async with t.db.execute("CREATE TABLE foo(bar)") as c:
            res = await c.fetchone()
            assert res is None


async def _insert_note(
    db: Database,
    *,
    uuid: UUID,
    title: str = "",
    text: str = "",
    creation_date: datetime.datetime = datetime.datetime(2000, 1, 1, 12, 0, 0),
    last_changed: datetime.datetime = datetime.datetime(2000, 1, 1, 12, 0, 0),
) -> None:
    await db.execute_commit(
        "INSERT INTO notes(uuid, title, text, creation_date, last_changed) "
        "VALUES(?, ?, ?, ?, ?)",
        [
            str(uuid),
            title,
            text,
            db_datetime(creation_date),
            db_datetime_old(last_changed),
        ],
    )


async def test_select_all_notes(db: Database) -> None:
    creation_date = datetime.datetime(2021, 5, 14, 13, 19, 4)
    last_changed = datetime.datetime(2021, 9, 19, 4, 34, 12)
    await _insert_note(
        db,
        uuid=_UUID,
        title="Test Note",
        text="Test text",
        creation_date=creation_date,
        last_changed=last_changed,
    )
    notes = await select_all_notes(db)
    assert len(notes) == 1
    assert notes[0] == Note(
        _UUID, "Test Note", "Test text", creation_date, last_changed
    )


async def test_select_note(db: Database) -> None:
    creation_date = datetime.datetime(2021, 5, 14, 13, 19, 4)
    last_changed = datetime.datetime(2021, 9, 19, 4, 34, 12)
    await _insert_note(
        db,
        uuid=_UUID,
        title="Test Note",
        text="Test text",
        creation_date=creation_date,
        last_changed=last_changed,
    )
    await _insert_note(db, uuid=_UUID2)
    note = await select_note(db, _UUID)
    assert note == Note(
        _UUID, "Test Note", "Test text", creation_date, last_changed
    )


async def test_select_note__unknown(db: Database) -> None:
    await _insert_note(db, uuid=_UUID2)
    with pytest.raises(UnknownItemError):
        await select_note(db, _UUID)


async def test_insert_note(db: Database) -> None:
    async with db.begin() as t:
        note = await insert_note(t, "New Note", "New text")
    assert isinstance(note.uuid, UUID)
    assert note.title == "New Note"
    assert note.text == "New text"
    assert isinstance(note.last_changed, datetime.datetime)
    row = await db.execute_fetchone(
        "SELECT uuid, title, text, creation_date, last_changed FROM notes"
    )
    assert row is not None
    assert row == (
        str(note.uuid),
        "New Note",
        "New text",
        db_datetime(note.creation_date),
        db_datetime_old(note.last_changed),
    )


async def test_update_note(db: Database) -> None:
    await _insert_note(
        db,
        uuid=_UUID,
        title="Old Title",
        text="Old text",
        last_changed=datetime.datetime(2000, 1, 1, 12, 0, 0),
    )
    async with db.begin() as t:
        note = await update_note(t, _UUID, "New Note", "New text")
    assert note.uuid == _UUID
    assert note.title == "New Note"
    assert note.text == "New text"
    assert note.last_changed.year > 2000
    row = await db.execute_fetchone(
        "SELECT uuid, title, text, last_changed FROM notes"
    )
    assert row is not None
    assert row == (
        str(_UUID),
        "New Note",
        "New text",
        db_datetime_old(note.last_changed),
    )


async def test_update_note__unknown(db: Database) -> None:
    with pytest.raises(UnknownItemError):
        async with db.begin() as t:
            await update_note(t, _UUID, "New Note", "New text")


async def test_delete_note(db: Database) -> None:
    await _insert_note(db, uuid=_UUID)
    await _insert_note(db, uuid=_UUID2)
    async with db.begin() as t:
        await delete_note(t, _UUID)
    row = await db.execute_fetchone("SELECT uuid FROM notes")
    assert row is not None
    assert row[0] == str(_UUID2)


async def test_delete_note__unknown(db: Database) -> None:
    with pytest.raises(UnknownItemError):
        async with db.begin() as t:
            await delete_note(t, _UUID)
