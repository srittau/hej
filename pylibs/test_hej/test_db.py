from __future__ import annotations

import datetime
from tempfile import NamedTemporaryFile
from typing import AsyncGenerator
from uuid import UUID

import pytest
import pytest_asyncio

from hej.db import (
    Database,
    db_datetime,
    delete_note,
    insert_note,
    open_db,
    open_transaction,
    select_all_notes,
    select_note,
    update_note,
)
from hej.exc import UnknownItemError
from hej.note import Note

_UUID = UUID("7bb570bf-2e21-4baf-b963-23c454e052ab")
_UUID2 = UUID("dd877ebd-a9cf-466d-99f2-1327e2068ff2")


@pytest_asyncio.fixture
async def db() -> AsyncGenerator[Database, None]:  # type: ignore[misc]
    async with open_db(":memory:") as db:
        yield db


@pytest.mark.asyncio
async def test_open_db__initialized() -> None:
    async with open_db(":memory:") as db:
        notes = await db.db.execute_fetchall("SELECT * FROM notes")
        assert len(notes) == 0  # type: ignore


@pytest.mark.asyncio
async def test_open_db__dont_initialize_twice() -> None:
    with NamedTemporaryFile() as db_file:
        async with open_db(db_file.name) as db:
            async with db.begin() as t:
                await t.db.execute(
                    "INSERT INTO notes VALUES(?, ?, ?, ?)",
                    [
                        str(_UUID),
                        "Test",
                        "",
                        db_datetime(datetime.datetime.utcnow()),
                    ],
                )
        async with open_db(db_file.name) as db:
            notes = await db.db.execute_fetchall("SELECT * FROM notes")
            assert len(notes) == 1  # type: ignore


@pytest.mark.asyncio
async def test_open_transaction() -> None:
    async with open_transaction(":memory:") as t:
        async with t.db.execute("SELECT COUNT(*) FROM notes") as c:
            res = await c.fetchone()
            assert res is not None
            assert res[0] == 0


async def _insert_note(
    db: Database,
    *,
    uuid: UUID,
    title: str = "",
    text: str = "",
    last_changed: datetime.datetime = datetime.datetime(2000, 1, 1, 12, 0, 0),
) -> None:
    await db.execute_commit(
        "INSERT INTO notes(uuid, title, text, last_changed) "
        "VALUES(?, ?, ?, ?)",
        [str(uuid), title, text, db_datetime(last_changed)],
    )


@pytest.mark.asyncio
async def test_select_all_notes(db: Database) -> None:
    dt = datetime.datetime(2021, 9, 19, 4, 34, 12)
    await _insert_note(
        db,
        uuid=_UUID,
        title="Test Note",
        text="Test text",
        last_changed=dt,
    )
    notes = await select_all_notes(db)
    assert len(notes) == 1
    assert notes[0] == Note(_UUID, "Test Note", "Test text", dt)


@pytest.mark.asyncio
async def test_select_note(db: Database) -> None:
    dt = datetime.datetime(2021, 9, 19, 4, 34, 12)
    await _insert_note(
        db,
        uuid=_UUID,
        title="Test Note",
        text="Test text",
        last_changed=dt,
    )
    await _insert_note(db, uuid=_UUID2)
    note = await select_note(db, _UUID)
    assert note == Note(_UUID, "Test Note", "Test text", dt)


@pytest.mark.asyncio
async def test_select_note__unknown(db: Database) -> None:
    await _insert_note(db, uuid=_UUID2)
    with pytest.raises(UnknownItemError):
        await select_note(db, _UUID)


@pytest.mark.asyncio
async def test_insert_note(db: Database) -> None:
    async with db.begin() as t:
        note = await insert_note(t, "New Note", "New text")
    assert isinstance(note.uuid, UUID)
    assert note.title == "New Note"
    assert note.text == "New text"
    assert isinstance(note.last_changed, datetime.datetime)
    row = await db.execute_fetchone("SELECT * FROM notes")
    assert row is not None
    assert row == (
        str(note.uuid),
        "New Note",
        "New text",
        db_datetime(note.last_changed),
    )


@pytest.mark.asyncio
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
    row = await db.execute_fetchone("SELECT * FROM notes")
    assert row is not None
    assert row == (
        str(_UUID),
        "New Note",
        "New text",
        db_datetime(note.last_changed),
    )


@pytest.mark.asyncio
async def test_update_note__unknown(db: Database) -> None:
    with pytest.raises(UnknownItemError):
        async with db.begin() as t:
            await update_note(t, _UUID, "New Note", "New text")


@pytest.mark.asyncio
async def test_delete_note(db: Database) -> None:
    await _insert_note(db, uuid=_UUID)
    await _insert_note(db, uuid=_UUID2)
    async with db.begin() as t:
        await delete_note(t, _UUID)
    row = await db.execute_fetchone("SELECT uuid FROM notes")
    assert row is not None
    assert row[0] == str(_UUID2)


@pytest.mark.asyncio
async def test_delete_note__unknown(db: Database) -> None:
    with pytest.raises(UnknownItemError):
        async with db.begin() as t:
            await delete_note(t, _UUID)
