from __future__ import annotations

import datetime
import os
from pathlib import Path
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
from graphql import GraphQLResolveInfo

from hej.exc import UnknownItemError

from .article import Article
from .db import (
    db_url,
    delete_article,
    insert_article,
    open_transaction,
    select_all_articles,
    select_article,
    update_article,
)
from .debug import debug


def schema_file() -> Path:
    path_s = os.getenv("HEJ_SCHEMA_PATH")
    if path_s is None:
        path = Path(__file__).parent.parent.parent / "schema.graphql"
    else:
        path = Path(path_s)
    return path


type_defs = load_schema_from_path(str(schema_file()))

datetime_scalar = ScalarType("DateTime")


@datetime_scalar.serializer
def serialize_datetime(dt: datetime.datetime) -> str:
    return dt.isoformat()[:19] + "Z"


article = ObjectType("Article")

query = QueryType()


@query.field("articles")
async def resolve_articles(
    _: None, __: GraphQLResolveInfo, *, uuid: str | None = None
) -> list[Article]:
    if uuid is None:
        async with open_transaction(db_url()) as db:
            return await select_all_articles(db)
    else:
        try:
            uuid_o = UUID(uuid)
        except ValueError:
            return []
        async with open_transaction(db_url()) as db:
            try:
                article = await select_article(db, uuid_o)
            except UnknownItemError:
                return []
            else:
                return [article]


mutation = MutationType()


@mutation.field("createArticle")
async def resolve_create_article(
    _: None, __: GraphQLResolveInfo, *, title: str, text: str | None = None
) -> Article:
    async with open_transaction(db_url()) as db:
        return await insert_article(db, title, text or "")


@mutation.field("updateArticle")
async def resolve_update_article(
    _: None,
    __: GraphQLResolveInfo,
    *,
    uuid: str,
    title: str | None = None,
    text: str | None = None,
) -> Article | None:
    try:
        uuid_o = UUID(uuid)
    except ValueError:
        return None

    async with open_transaction(db_url()) as db:
        try:
            return await update_article(db, uuid_o, title, text)
        except UnknownItemError:
            return None


@mutation.field("deleteArticle")
async def resolve_delete_article(
    _: None, __: GraphQLResolveInfo, *, uuid: str
) -> bool:
    try:
        uuid_o = UUID(uuid)
    except ValueError:
        return False

    async with open_transaction(db_url()) as db:
        try:
            await delete_article(db, uuid_o)
        except UnknownItemError:
            return False
        else:
            return True


schema = make_executable_schema(
    type_defs,
    snake_case_fallback_resolvers,
    datetime_scalar,
    article,
    query,
    mutation,
)

app = GraphQL(schema, debug=debug())
