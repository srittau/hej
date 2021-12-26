from __future__ import annotations

import asyncio
from pathlib import Path
from uuid import UUID

import click
from click.core import Context
from click.exceptions import BadParameter

from hej.exc import UnknownItemError

from .article import Article
from .db import (
    delete_article,
    insert_article,
    open_transaction,
    select_all_articles,
    select_article,
    update_article,
)

list_ = list


@click.group()
@click.option("--database", help="path to the database file")
@click.pass_context
def cli(ctx: Context, *, database: str | None = None) -> None:
    ctx.obj["db_url"] = _db_url(database)


def _db_url(database: str | None) -> str:
    if database is not None:
        return f"file:{database}"
    return str(Path.home() / ".hey.sqlite")


@cli.command()
@click.argument("title")
@click.argument("text")
@click.pass_context
def create(ctx: Context, *, title: str, text: str) -> None:
    async def create_article() -> Article:
        async with open_transaction(ctx.obj["db_url"]) as db:
            return await insert_article(db, title, text)

    article = asyncio.run(create_article())
    click.echo(f"Article created with UUID {article.uuid}")


@cli.command()
@click.argument("uuid", type=click.UUID)
@click.argument("title")
@click.argument("text")
@click.pass_context
def update(ctx: Context, *, uuid: UUID, title: str, text: str) -> None:
    async def change_article() -> Article:
        async with open_transaction(ctx.obj["db_url"]) as db:
            return await update_article(db, uuid, title, text)

    try:
        asyncio.run(change_article())
    except UnknownItemError:
        raise BadParameter(f"unknown article '{uuid}'", param_hint="uuid")


@cli.command()
@click.pass_context
def list(ctx: Context) -> None:
    async def list_articles() -> list_[Article]:
        async with open_transaction(ctx.obj["db_url"]) as db:
            return await select_all_articles(db)

    articles = asyncio.run(list_articles())
    for article in articles:
        click.echo(f"{article.uuid} {article.title}")
    if articles:
        click.echo()
    click.echo(f"Total {len(articles)} articles")


@cli.command()
@click.pass_context
@click.argument("uuid", type=click.UUID)
def view(ctx: Context, *, uuid: UUID) -> None:
    async def read_article() -> Article:
        async with open_transaction(ctx.obj["db_url"]) as db:
            return await select_article(db, uuid)

    try:
        article = asyncio.run(read_article())
    except UnknownItemError:
        raise BadParameter(f"unknown article '{uuid}'", param_hint="uuid")

    click.echo(article.title)
    click.echo()
    click.echo(article.text)
    click.echo()
    click.echo(f"Last changed: {article.last_changed}")


@cli.command()
@click.argument("uuid", type=click.UUID)
@click.pass_context
def delete(ctx: Context, *, uuid: UUID) -> None:
    async def remove_article() -> None:
        async with open_transaction(ctx.obj["db_url"]) as db:
            await delete_article(db, uuid)

    try:
        asyncio.run(remove_article())
    except UnknownItemError:
        raise BadParameter(f"unknown article '{uuid}'", param_hint="uuid")


def main() -> None:
    cli(obj={})
