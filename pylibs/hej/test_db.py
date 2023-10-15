from __future__ import annotations

import datetime
from uuid import UUID

import pytest

from .db import (
    db_datetime,
    db_datetime_old,
    delete_note,
    insert_note,
    open_transaction,
    select_all_notes,
    select_note,
    update_note,
)
from .exc import UnknownItemError
from .note import Note
from .testutil_db import DatabaseFixture, db  # noqa: F401

_UUID = UUID("7bb570bf-2e21-4baf-b963-23c454e052ab")
_UUID2 = UUID("dd877ebd-a9cf-466d-99f2-1327e2068ff2")


async def test_open_transaction() -> None:
    async with open_transaction(":memory:") as t:
        async with t.db.execute("CREATE TABLE foo(bar)") as c:
            res = await c.fetchone()
            assert res is None


async def test_select_all_notes(db: DatabaseFixture) -> None:  # noqa: F811
    creation_date = datetime.datetime(2021, 5, 14, 13, 19, 4)
    last_changed = datetime.datetime(2021, 9, 19, 4, 34, 12)
    await db.insert_note(
        uuid=_UUID,
        title="Test Note",
        text="Test text",
        creation_date=creation_date,
        last_changed=last_changed,
    )
    notes = await select_all_notes(db.db)
    assert len(notes) == 1
    assert notes[0] == Note(
        _UUID, "Test Note", "Test text", False, creation_date, last_changed
    )


async def test_select_note(db: DatabaseFixture) -> None:  # noqa: F811
    creation_date = datetime.datetime(2021, 5, 14, 13, 19, 4)
    last_changed = datetime.datetime(2021, 9, 19, 4, 34, 12)
    await db.insert_note(
        uuid=_UUID,
        title="Test Note",
        text="Test text",
        creation_date=creation_date,
        last_changed=last_changed,
    )
    await db.insert_note(uuid=_UUID2)
    note = await select_note(db.db, _UUID)
    assert note == Note(
        _UUID, "Test Note", "Test text", False, creation_date, last_changed
    )


async def test_select_note__unknown(db: DatabaseFixture) -> None:  # noqa: F811
    await db.insert_note(uuid=_UUID2)
    with pytest.raises(UnknownItemError):
        await select_note(db.db, _UUID)


async def test_insert_note(db: DatabaseFixture) -> None:  # noqa: F811
    async with db.begin() as t:
        note = await insert_note(t, "New Note", "New text")
    assert isinstance(note.uuid, UUID)
    assert note.title == "New Note"
    assert note.text == "New text"
    assert isinstance(note.last_changed, datetime.datetime)
    await db.assert_only_row_equals(
        "notes",
        {
            "uuid": note.uuid,
            "title": "New Note",
            "text": "New text",
            "creation_date": db_datetime(note.creation_date),
            "last_changed": db_datetime_old(note.last_changed),
        },
    )


async def test_update_note(db: DatabaseFixture) -> None:  # noqa: F811
    await db.insert_note(
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
    await db.assert_only_row_equals(
        "notes",
        {
            "uuid": _UUID,
            "title": "New Note",
            "text": "New text",
            "last_changed": db_datetime_old(note.last_changed),
        },
    )


async def test_update_note__unknown(db: DatabaseFixture) -> None:  # noqa: F811
    with pytest.raises(UnknownItemError):
        async with db.begin() as t:
            await update_note(t, _UUID, "New Note", "New text")


async def test_delete_note(db: DatabaseFixture) -> None:  # noqa: F811
    await db.insert_note(uuid=_UUID)
    await db.insert_note(uuid=_UUID2)
    async with db.begin() as t:
        await delete_note(t, _UUID)
    await db.assert_only_row_equals("notes", {"uuid": _UUID2})


async def test_delete_note__unknown(db: DatabaseFixture) -> None:  # noqa: F811
    with pytest.raises(UnknownItemError):
        async with db.begin() as t:
            await delete_note(t, _UUID)
