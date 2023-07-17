from __future__ import annotations

import asyncio
import sys
from uuid import UUID

import click
from click.core import Context
from click.exceptions import BadParameter

from hej.exc import UnknownItemError

from .db import (
    db_url,
    delete_note,
    insert_note,
    open_transaction,
    select_all_notes,
    select_note,
    update_note,
)
from .note import Note

list_ = list


@click.group()
@click.option("--database", help="path to the database file")
@click.pass_context
def cli(ctx: Context, *, database: str | None = None) -> None:
    ctx.obj["db_url"] = db_url(database)


@cli.command()  # type: ignore[attr-defined,misc]
@click.argument("title")
@click.argument("text", required=False)
@click.pass_context
def create(ctx: Context, *, title: str, text: str | None = None) -> None:
    async def create_note() -> Note:
        async with open_transaction(ctx.obj["db_url"]) as db:
            return await insert_note(db, title, full_text)

    full_text = _read_text(text)
    note = asyncio.run(create_note())
    click.echo(f"Note created with UUID {note.uuid}")


@cli.command()  # type: ignore[attr-defined,misc]
@click.argument("uuid", type=click.UUID)
@click.argument("title")
@click.argument("text", required=False)
@click.pass_context
def update(ctx: Context, *, uuid: UUID, title: str, text: str) -> None:
    async def change_note() -> Note:
        async with open_transaction(ctx.obj["db_url"]) as db:
            return await update_note(db, uuid, title, full_text)

    full_text = _read_text(text)
    try:
        asyncio.run(change_note())
    except UnknownItemError:
        raise BadParameter(f"unknown note '{uuid}'", param_hint="uuid")


def _read_text(text: str | None) -> str:
    if text is not None:
        return text
    else:
        return sys.stdin.read()


@cli.command()  # type: ignore[attr-defined,misc]
@click.pass_context
def list(ctx: Context) -> None:
    async def list_notes() -> list_[Note]:
        async with open_transaction(ctx.obj["db_url"]) as db:
            return await select_all_notes(db)

    notes = asyncio.run(list_notes())
    for note in notes:
        click.echo(f"{note.uuid} {note.title}")
    if notes:
        click.echo()
    click.echo(f"Total {len(notes)} notes")


@cli.command()  # type: ignore[attr-defined,misc]
@click.pass_context
@click.argument("uuid", type=click.UUID)
def view(ctx: Context, *, uuid: UUID) -> None:
    async def read_note() -> Note:
        async with open_transaction(ctx.obj["db_url"]) as db:
            return await select_note(db, uuid)

    try:
        note = asyncio.run(read_note())
    except UnknownItemError:
        raise BadParameter(f"unknown note '{uuid}'", param_hint="uuid")

    click.echo(note.title)
    click.echo()
    click.echo(note.text)
    click.echo()
    click.echo(f"Last changed: {note.last_changed}")


@cli.command()  # type: ignore[attr-defined,misc]
@click.argument("uuid", type=click.UUID)
@click.pass_context
def delete(ctx: Context, *, uuid: UUID) -> None:
    async def remove_note() -> None:
        async with open_transaction(ctx.obj["db_url"]) as db:
            await delete_note(db, uuid)

    try:
        asyncio.run(remove_note())
    except UnknownItemError:
        raise BadParameter(f"unknown note '{uuid}'", param_hint="uuid")


def main() -> None:
    cli(obj={})  # type: ignore[misc]
