from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator
from uuid import UUID

import pytest
from asserts import assert_json_subset
from graphql import GraphQLSchema
from pytest_mock import MockerFixture, mocker  # noqa: F401

from .db import Database
from .testutil_db import DatabaseFixture, db_o  # noqa: F401
from .testutil_gql import GQLFixture, gql_schema  # noqa: F401

# Some test UUIDs.
UUID1 = UUID("4b6b1145-933d-47bd-ba7e-279751bb8f7b")
UUID2 = UUID("b77f6851-058c-4847-90ad-a63ebb935b43")


class IntegrationFixture(GQLFixture, DatabaseFixture):
    def __init__(
        self,
        schema: GraphQLSchema,
        db: Database,  # noqa: F811
    ) -> None:
        GQLFixture.__init__(self, schema)
        DatabaseFixture.__init__(self, db)


@pytest.fixture
def fix(
    gql_schema: GraphQLSchema,  # noqa: F811
    db_o: Database,  # noqa: F811
    mocker: MockerFixture,  # noqa: F811
) -> IntegrationFixture:
    @asynccontextmanager
    async def open_db(_: object) -> AsyncGenerator[Database, None]:
        yield db_o

    mocker.patch("hej.db.open_db", open_db)
    return IntegrationFixture(gql_schema, db_o)


class TestNotes:
    async def test_all_notes(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(
            uuid=UUID("4b6b1145-933d-47bd-ba7e-279751bb8f7b"), title="Note #1"
        )
        await fix.insert_note(
            uuid=UUID("b77f6851-058c-4847-90ad-a63ebb935b43"), title="Note #2"
        )
        await fix.insert_note(
            uuid=UUID("fb79a130-798e-4e59-8230-e64cbc49a0b5"), title="Note #3"
        )
        response = await fix.gql(
            """
                query {
                    notes {
                        uuid
                        title
                    }
                }
            """
        )
        assert_json_subset(
            {"notes": [{}, {}, {}]},
            response,
        )
        notes: list[dict[str, Any]] = response["notes"]
        notes.sort(key=lambda note: note["title"])
        assert_json_subset(
            [
                {
                    "uuid": "4b6b1145-933d-47bd-ba7e-279751bb8f7b",
                    "title": "Note #1",
                },
                {
                    "uuid": "b77f6851-058c-4847-90ad-a63ebb935b43",
                    "title": "Note #2",
                },
                {
                    "uuid": "fb79a130-798e-4e59-8230-e64cbc49a0b5",
                    "title": "Note #3",
                },
            ],
            notes,
        )

    async def test_single_note(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(
            uuid=UUID("4b6b1145-933d-47bd-ba7e-279751bb8f7b"), title="Note #1"
        )
        await fix.insert_note(
            uuid=UUID("b77f6851-058c-4847-90ad-a63ebb935b43"),
            title="Note #2",
            favorite=True,
        )
        await fix.insert_note(
            uuid=UUID("fb79a130-798e-4e59-8230-e64cbc49a0b5"), title="Note #3"
        )
        response = await fix.gql(
            """
                query {
                    notes(uuid: "b77f6851-058c-4847-90ad-a63ebb935b43") {
                        uuid
                        title
                        favorite
                    }
                }
            """
        )
        assert_json_subset(
            {
                "notes": [
                    {
                        "uuid": "b77f6851-058c-4847-90ad-a63ebb935b43",
                        "title": "Note #2",
                        "favorite": True,
                    }
                ]
            },
            response,
        )

    async def test_unknown_note(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(
            uuid=UUID("4b6b1145-933d-47bd-ba7e-279751bb8f7b"), title="Note #1"
        )
        response = await fix.gql(
            """
                query {
                    notes(uuid: "a7233ac1-03b3-47d9-9dfb-95d9b3659d74") {
                        uuid
                    }
                }
            """
        )
        assert_json_subset({"notes": []}, response)


class TestMarkNoteAsFavorite:
    async def test_mark(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1, favorite=False)
        await fix.insert_note(uuid=UUID2, favorite=False)
        response = await fix.gql(
            f"""
                mutation {{
                    response: markNoteAsFavorite(
                        uuid: "{UUID2}",
                        favorite: true
                    ) {{
                        uuid
                        favorite
                    }}
                }}
            """
        )
        assert response == {
            "response": {
                "uuid": str(UUID2),
                "favorite": True,
            }
        }
        await fix.assert_one_row_equals(
            "notes",
            {
                "uuid": UUID("b77f6851-058c-4847-90ad-a63ebb935b43"),
                "favorite": True,
            },
        )

    async def test_unknown_note(self, fix: IntegrationFixture) -> None:
        response = await fix.gql(
            """
                mutation {
                    response: markNoteAsFavorite(
                        uuid: "a7233ac1-03b3-47d9-9dfb-95d9b3659d74",
                        favorite: true
                    ) {
                        __typename
                    }
                }
            """
        )
        assert response == {"response": None}
