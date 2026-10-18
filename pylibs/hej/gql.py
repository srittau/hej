from __future__ import annotations

import asyncio
import datetime
import functools
import logging
import os
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any, Literal, Required, TypedDict, cast
from uuid import UUID

from ariadne import (
    InterfaceType,
    QueryType,
    UnionType,
    load_schema_from_path,
    make_executable_schema,
)
from ariadne.asgi import GraphQL
from ariadne.objects import MutationType, ObjectType
from ariadne.scalars import ScalarType
from graphql import GraphQLError, GraphQLResolveInfo, GraphQLSchema
from starlette.requests import Request

from hej.auth import authenticate, check_session_key
from hej.colors import Color, validate_rgb_color
from hej.db import (
    Transaction,
    attach_note_label,
    db_url,
    delete_label,
    delete_note,
    detach_note_label,
    insert_label,
    insert_note,
    open_transaction,
    select_all_labels,
    select_all_notes,
    select_favorited_labels,
    select_label_by_slug,
    select_labels_by_note,
    select_note,
    select_notes_by_label,
    update_label,
    update_note,
)
from hej.debug import debug
from hej.exc import DuplicateItemError, UnknownItemError
from hej.label import Label, normalize_label_name
from hej.note import Note
from hej.slug import slugify

LOGGER = logging.getLogger(__name__)


class GQLValueError(TypedDict):
    __typename: Literal["ValueError"]
    message: str


class GQLUnknownItemError(TypedDict):
    __typename: Literal["UnknownItemError"]
    message: str
    missing_type: str


class GQLDuplicateItemError(TypedDict):
    __typename: Literal["DuplicateItemError"]
    message: str


class InfoContext(TypedDict, total=False):
    request: Required[Request]
    auth: bool
    # Per-request caches. They hold tasks instead of results, because
    # sibling fields are resolved concurrently, so several resolvers can
    # ask for the same data before the first query has finished.
    # Mutations that change notes or labels must call `_invalidate_caches()`.
    #
    # Map note UUIDs to their labels.
    note_labels: asyncio.Task[dict[UUID, list[Label]]]
    # Map label UUIDs to their notes. Filled per label.
    label_notes: dict[UUID, asyncio.Task[list[Note]]]


def schema_file() -> Path:
    path_s = os.getenv("HEJ_GQL_SCHEMA_PATH")
    if path_s is None:
        path = Path(__file__).parent.parent.parent / "schema.graphql"
    else:
        path = Path(path_s)
    return path


def require_auth[F: Callable[..., Awaitable[Any]]](f: F) -> F:
    @functools.wraps(f)
    async def check_auth(  # type: ignore[misc]
        obj: Any, info: GraphQLResolveInfo[InfoContext], **kwargs: Any
    ) -> Any:
        assert isinstance(info.context, dict)
        if not info.context.get("auth", False):
            await authenticate(info.context["request"])
            info.context["auth"] = True
        return await f(obj, info, **kwargs)

    return check_auth  # type: ignore


type_defs = load_schema_from_path(str(schema_file()))

datetime_scalar = ScalarType("DateTime")


@datetime_scalar.serializer
def serialize_datetime(dt: datetime.datetime) -> str:
    if dt.tzinfo is None:
        LOGGER.warning("datetime %s has no timezone", dt)
    elif dt.tzinfo != datetime.UTC:
        raise ValueError(f"datetime {dt} has non-UTC timezone")
    return dt.isoformat()[:19] + "Z"


color_scalar = ScalarType("Color")


@color_scalar.serializer
def serialize_color(color: str) -> Color:
    validate_rgb_color(color)
    return cast(Color, color.lower())


@color_scalar.value_parser
def parse_color_value(value: str) -> Color:
    validate_rgb_color(value)
    return cast(Color, value.lower())


def resolve_result_type(obj: object, *_: Any) -> str:
    if isinstance(obj, dict):
        return cast(str, obj["__typename"])
    return type(obj).__name__


user_error = InterfaceType("UserError", resolve_result_type)
create_label_result = UnionType("CreateLabelResult", resolve_result_type)
update_label_result = UnionType("UpdateLabelResult", resolve_result_type)
note_result = UnionType("NoteResult", resolve_result_type)

note = ObjectType("Note")


@note.field("labels")
@require_auth
async def resolve_note_labels(
    note: Note,
    info: GraphQLResolveInfo[InfoContext],
) -> list[Label]:
    task = info.context.get("note_labels")
    if task is None:
        task = asyncio.ensure_future(_load_labels_by_note())
        info.context["note_labels"] = task
    labels_by_note = await task
    return labels_by_note.get(note.uuid, [])


async def _load_labels_by_note() -> dict[UUID, list[Label]]:
    async with open_transaction(db_url()) as db:
        return await select_labels_by_note(db)


label = ObjectType("Label")


@label.field("notes")
@require_auth
async def resolve_label_notes(
    label: Label, info: GraphQLResolveInfo[InfoContext]
) -> list[Note]:
    return await _label_notes(info, label.uuid)


@label.field("noteCount")
@require_auth
async def resolve_label_note_count(
    label: Label, info: GraphQLResolveInfo[InfoContext]
) -> int:
    return len(await _label_notes(info, label.uuid))


async def _label_notes(
    info: GraphQLResolveInfo[InfoContext], label_uuid: UUID
) -> list[Note]:
    tasks = info.context.setdefault("label_notes", {})
    task = tasks.get(label_uuid)
    if task is None:
        task = asyncio.ensure_future(_load_notes_by_label(label_uuid))
        tasks[label_uuid] = task
    return await task


async def _load_notes_by_label(label_uuid: UUID) -> list[Note]:
    async with open_transaction(db_url()) as db:
        return await select_notes_by_label(db, label_uuid)


def _invalidate_caches(info: GraphQLResolveInfo[InfoContext]) -> None:
    info.context.pop("note_labels", None)
    info.context.pop("label_notes", None)


query = QueryType()


@query.field("labels")
@require_auth
async def resolve_labels(
    _: None,
    __: GraphQLResolveInfo[InfoContext],
    *,
    slug: str | None = None,
    favorites: bool | None = None,
) -> list[Label]:
    if slug is not None and favorites is not None:
        raise GraphQLError(
            "arguments 'slug' and 'favorites' are mutually exclusive"
        )
    async with open_transaction(db_url()) as db:
        if slug is not None:
            try:
                return [await select_label_by_slug(db, slug)]
            except UnknownItemError:
                return []
        elif favorites:
            return await select_favorited_labels(db)
        else:
            return await select_all_labels(db)


@query.field("notes")
@require_auth
async def resolve_notes(
    _: None, __: GraphQLResolveInfo[InfoContext], *, uuid: str | None = None
) -> list[Note]:
    if uuid is None:
        async with open_transaction(db_url()) as db:
            return await select_all_notes(db)
    else:
        try:
            uuid_o = UUID(uuid)
        except ValueError:
            return []
        async with open_transaction(db_url()) as db:
            try:
                note = await select_note(db, uuid_o)
            except UnknownItemError:
                return []
            else:
                return [note]


mutation = MutationType()


@mutation.field("login")
async def resolve_login(
    _: None, __: GraphQLResolveInfo[InfoContext], *, password: str
) -> str | None:
    if not check_session_key(password):
        return None
    return password


@mutation.field("logout")
@require_auth
async def resolve_logout(_: None, __: GraphQLResolveInfo[InfoContext]) -> bool:
    return True  # no op


@mutation.field("createLabel")
@require_auth
async def resolve_create_label(
    _: None,
    __: GraphQLResolveInfo[InfoContext],
    *,
    name: str,
    color: Color,
    favorite: bool = False,
) -> Label | GQLValueError | GQLDuplicateItemError:
    try:
        name = normalize_label_name(name)
    except ValueError as exc:
        return {"__typename": "ValueError", "message": str(exc)}
    async with open_transaction(db_url()) as db:
        try:
            return await insert_label(db, name, slugify(name), color, favorite)
        except DuplicateItemError as exc:
            return {"__typename": "DuplicateItemError", "message": str(exc)}


@mutation.field("updateLabel")
@require_auth
async def resolve_update_label(
    _: None,
    info: GraphQLResolveInfo[InfoContext],
    *,
    uuid: str,
    name: str | None = None,
    color: Color | None = None,
    favorite: bool | None = None,
) -> Label | GQLUnknownItemError | GQLDuplicateItemError | GQLValueError:
    _invalidate_caches(info)
    try:
        uuid_o = UUID(uuid)
    except ValueError:
        return _unknown_item_error("Label", uuid)
    base_slug = None
    if name is not None:
        try:
            name = normalize_label_name(name)
        except ValueError as exc:
            return {"__typename": "ValueError", "message": str(exc)}
        base_slug = slugify(name)
    async with open_transaction(db_url()) as db:
        try:
            return await update_label(
                db,
                uuid_o,
                name=name,
                base_slug=base_slug,
                color=color,
                favorite=favorite,
            )
        except UnknownItemError:
            return _unknown_item_error("Label", uuid)
        except DuplicateItemError as exc:
            return {"__typename": "DuplicateItemError", "message": str(exc)}


@mutation.field("deleteLabel")
@require_auth
async def resolve_delete_label(
    _: None, info: GraphQLResolveInfo[InfoContext], *, uuid: str
) -> bool:
    _invalidate_caches(info)
    try:
        uuid_o = UUID(uuid)
    except ValueError:
        return False

    async with open_transaction(db_url()) as db:
        try:
            await delete_label(db, uuid_o)
        except UnknownItemError:
            return False
        else:
            return True


def _unknown_item_error(missing_type: str, uuid: str) -> GQLUnknownItemError:
    return {
        "__typename": "UnknownItemError",
        "message": f"unknown {missing_type.lower()} '{uuid}'",
        "missing_type": missing_type,
    }


@mutation.field("createNote")
@require_auth
async def resolve_create_note(
    _: None,
    __: GraphQLResolveInfo[InfoContext],
    *,
    title: str,
    text: str | None = None,
) -> Note:
    async with open_transaction(db_url()) as db:
        return await insert_note(db, title, text or "")


@mutation.field("updateNote")
@require_auth
async def resolve_update_note(
    _: None,
    info: GraphQLResolveInfo[InfoContext],
    *,
    uuid: str,
    title: str | None = None,
    text: str | None = None,
) -> Note | None:
    _invalidate_caches(info)
    try:
        uuid_o = UUID(uuid)
    except ValueError:
        return None

    async with open_transaction(db_url()) as db:
        try:
            return await update_note(db, uuid_o, title, text)
        except UnknownItemError:
            return None


@mutation.field("attachNoteLabel")
@require_auth
async def resolve_attach_note_label(
    _: None,
    info: GraphQLResolveInfo[InfoContext],
    *,
    note_uuid: str,
    label_uuid: str,
) -> Note | GQLUnknownItemError:
    _invalidate_caches(info)
    return await _change_note_label(attach_note_label, note_uuid, label_uuid)


@mutation.field("detachNoteLabel")
@require_auth
async def resolve_detach_note_label(
    _: None,
    info: GraphQLResolveInfo[InfoContext],
    *,
    note_uuid: str,
    label_uuid: str,
) -> Note | GQLUnknownItemError:
    _invalidate_caches(info)
    return await _change_note_label(detach_note_label, note_uuid, label_uuid)


async def _change_note_label(
    change: Callable[[Transaction, UUID, UUID], Awaitable[None]],
    note_uuid: str,
    label_uuid: str,
) -> Note | GQLUnknownItemError:
    """Attach or detach a label and return the note."""
    try:
        note_uuid_o = UUID(note_uuid)
    except ValueError:
        return _unknown_item_error("Note", note_uuid)
    try:
        label_uuid_o = UUID(label_uuid)
    except ValueError:
        return _unknown_item_error("Label", label_uuid)

    async with open_transaction(db_url()) as db:
        try:
            await change(db, note_uuid_o, label_uuid_o)
        except UnknownItemError as exc:
            if exc.table == "notes":
                return _unknown_item_error("Note", note_uuid)
            else:
                return _unknown_item_error("Label", label_uuid)
        return await select_note(db, note_uuid_o)


@mutation.field("markNoteAsFavorite")
@require_auth
async def resolve_mark_note_as_favorite(
    _: None,
    info: GraphQLResolveInfo[InfoContext],
    *,
    uuid: str,
    favorite: bool,
) -> Note | None:
    _invalidate_caches(info)
    try:
        uuid_o = UUID(uuid)
    except ValueError:
        return None

    async with open_transaction(db_url()) as db:
        try:
            return await update_note(db, uuid_o, favorite=favorite)
        except UnknownItemError:
            return None


@mutation.field("deleteNote")
@require_auth
async def resolve_delete_note(
    _: None, info: GraphQLResolveInfo[InfoContext], *, uuid: str
) -> bool:
    _invalidate_caches(info)
    try:
        uuid_o = UUID(uuid)
    except ValueError:
        return False

    async with open_transaction(db_url()) as db:
        try:
            await delete_note(db, uuid_o)
        except UnknownItemError:
            return False
        else:
            return True


def bind_schema() -> GraphQLSchema:
    return make_executable_schema(
        type_defs,
        datetime_scalar,
        color_scalar,
        user_error,
        create_label_result,
        update_label_result,
        note_result,
        note,
        label,
        query,
        mutation,
        convert_names_case=True,
    )


def create_app() -> GraphQL:
    return GraphQL(bind_schema(), debug=debug())
