from __future__ import annotations

import datetime
import functools
import os
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import Any, TypeVar
from uuid import UUID

from ariadne import (
    QueryType,
    load_schema_from_path,
    make_executable_schema,
    snake_case_fallback_resolvers,
)
from ariadne.asgi import GraphQL
from ariadne.objects import MutationType, ObjectType
from ariadne.scalars import ScalarType
from graphql import GraphQLResolveInfo, GraphQLSchema

from hej.auth import authenticate, check_session_key
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
from .debug import debug
from .note import Note

_F = TypeVar("_F", bound=Callable[..., Awaitable[Any]])


def schema_file() -> Path:
    path_s = os.getenv("HEJ_GQL_SCHEMA_PATH")
    if path_s is None:
        path = Path(__file__).parent.parent.parent / "schema.graphql"
    else:
        path = Path(path_s)
    return path


def require_auth(f: _F) -> _F:
    @functools.wraps(f)
    async def check_auth(obj: Any, info: GraphQLResolveInfo, **kwargs: Any) -> Any:  # type: ignore
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
    return dt.isoformat()[:19] + "Z"


note = ObjectType("Note")

query = QueryType()


@query.field("notes")
@require_auth
async def resolve_notes(
    _: None, __: GraphQLResolveInfo, *, uuid: str | None = None
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
    _: None, __: GraphQLResolveInfo, *, password: str
) -> str | None:
    if not check_session_key(password):
        return None
    return password


@mutation.field("logout")
@require_auth
async def resolve_logout(_: None, __: GraphQLResolveInfo) -> bool:
    return True  # no op


@mutation.field("createNote")
@require_auth
async def resolve_create_note(
    _: None, __: GraphQLResolveInfo, *, title: str, text: str | None = None
) -> Note:
    async with open_transaction(db_url()) as db:
        return await insert_note(db, title, text or "")


@mutation.field("updateNote")
@require_auth
async def resolve_update_note(
    _: None,
    __: GraphQLResolveInfo,
    *,
    uuid: str,
    title: str | None = None,
    text: str | None = None,
) -> Note | None:
    try:
        uuid_o = UUID(uuid)
    except ValueError:
        return None

    async with open_transaction(db_url()) as db:
        try:
            return await update_note(db, uuid_o, title, text)
        except UnknownItemError:
            return None


@mutation.field("deleteNote")
@require_auth
async def resolve_delete_note(
    _: None, __: GraphQLResolveInfo, *, uuid: str
) -> bool:
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
        snake_case_fallback_resolvers,
        datetime_scalar,
        note,
        query,
        mutation,
    )


def create_app() -> GraphQL:
    return GraphQL(bind_schema(), debug=debug())
