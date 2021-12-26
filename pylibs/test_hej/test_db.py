from __future__ import annotations

import datetime
from tempfile import NamedTemporaryFile
from typing import AsyncGenerator
from uuid import UUID

import pytest

from hej.article import Article
from hej.db import (
    Database,
    db_datetime,
    delete_article,
    insert_article,
    open_db,
    open_transaction,
    select_all_articles,
    select_article,
    update_article,
)
from hej.exc import UnknownItemError

_UUID = UUID("7bb570bf-2e21-4baf-b963-23c454e052ab")
_UUID2 = UUID("dd877ebd-a9cf-466d-99f2-1327e2068ff2")


@pytest.fixture
async def db() -> AsyncGenerator[Database, None]:
    async with open_db(":memory:") as db:
        yield db


@pytest.mark.asyncio
async def test_open_db__initialized() -> None:
    async with open_db(":memory:") as db:
        articles = await db.db.execute_fetchall("SELECT * FROM articles")
        assert len(articles) == 0  # type: ignore


@pytest.mark.asyncio
async def test_open_db__dont_initialize_twice() -> None:
    with NamedTemporaryFile() as db_file:
        async with open_db(db_file.name) as db:
            async with db.begin() as t:
                await t.db.execute(
                    "INSERT INTO articles VALUES(?, ?, ?, ?)",
                    [
                        str(_UUID),
                        "Test",
                        "",
                        db_datetime(datetime.datetime.utcnow()),
                    ],
                )
        async with open_db(db_file.name) as db:
            articles = await db.db.execute_fetchall("SELECT * FROM articles")
            assert len(articles) == 1  # type: ignore


@pytest.mark.asyncio
async def test_open_transaction() -> None:
    async with open_transaction(":memory:") as t:
        async with t.db.execute("SELECT COUNT(*) FROM articles") as c:
            res = await c.fetchone()
            assert res is not None
            assert res[0] == 0


async def _insert_article(
    db: Database,
    *,
    uuid: UUID,
    title: str = "",
    text: str = "",
    last_changed: datetime.datetime = datetime.datetime(2000, 1, 1, 12, 0, 0),
) -> None:
    await db.execute_commit(
        "INSERT INTO articles(uuid, title, text, last_changed) "
        "VALUES(?, ?, ?, ?)",
        [str(uuid), title, text, db_datetime(last_changed)],
    )


@pytest.mark.asyncio
async def test_select_all_articles(db: Database) -> None:
    dt = datetime.datetime(2021, 9, 19, 4, 34, 12)
    await _insert_article(
        db,
        uuid=_UUID,
        title="Test Article",
        text="Test text",
        last_changed=dt,
    )
    articles = await select_all_articles(db)
    assert len(articles) == 1
    assert articles[0] == Article(_UUID, "Test Article", "Test text", dt)


@pytest.mark.asyncio
async def test_select_article(db: Database) -> None:
    dt = datetime.datetime(2021, 9, 19, 4, 34, 12)
    await _insert_article(
        db,
        uuid=_UUID,
        title="Test Article",
        text="Test text",
        last_changed=dt,
    )
    await _insert_article(db, uuid=_UUID2)
    article = await select_article(db, _UUID)
    assert article == Article(_UUID, "Test Article", "Test text", dt)


@pytest.mark.asyncio
async def test_select_article__unknown(db: Database) -> None:
    await _insert_article(db, uuid=_UUID2)
    with pytest.raises(UnknownItemError):
        await select_article(db, _UUID)


@pytest.mark.asyncio
async def test_insert_article(db: Database) -> None:
    async with db.begin() as t:
        article = await insert_article(t, "New Article", "New text")
    assert isinstance(article.uuid, UUID)
    assert article.title == "New Article"
    assert article.text == "New text"
    assert isinstance(article.last_changed, datetime.datetime)
    row = await db.execute_fetchone("SELECT * FROM articles")
    assert row is not None
    assert row == (
        str(article.uuid),
        "New Article",
        "New text",
        db_datetime(article.last_changed),
    )


@pytest.mark.asyncio
async def test_update_article(db: Database) -> None:
    await _insert_article(
        db,
        uuid=_UUID,
        title="Old Title",
        text="Old text",
        last_changed=datetime.datetime(2000, 1, 1, 12, 0, 0),
    )
    async with db.begin() as t:
        article = await update_article(t, _UUID, "New Article", "New text")
    assert article.uuid == _UUID
    assert article.title == "New Article"
    assert article.text == "New text"
    assert article.last_changed.year > 2000
    row = await db.execute_fetchone("SELECT * FROM articles")
    assert row is not None
    assert row == (
        str(_UUID),
        "New Article",
        "New text",
        db_datetime(article.last_changed),
    )


@pytest.mark.asyncio
async def test_update_article__unknown(db: Database) -> None:
    with pytest.raises(UnknownItemError):
        async with db.begin() as t:
            await update_article(t, _UUID, "New Article", "New text")


@pytest.mark.asyncio
async def test_delete_article(db: Database) -> None:
    await _insert_article(db, uuid=_UUID)
    await _insert_article(db, uuid=_UUID2)
    async with db.begin() as t:
        await delete_article(t, _UUID)
    row = await db.execute_fetchone("SELECT uuid FROM articles")
    assert row is not None
    assert row[0] == str(_UUID2)


@pytest.mark.asyncio
async def test_delete_article__unknown(db: Database) -> None:
    with pytest.raises(UnknownItemError):
        async with db.begin() as t:
            await delete_article(t, _UUID)
