from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any, Final, cast
from uuid import UUID

import pytest
from asserts import assert_json_subset
from graphql import GraphQLSchema
from pytest_mock import MockerFixture, mocker

from hej.db import Database
from hej.testutil_db import DatabaseFixture, db_o
from hej.testutil_gql import GQLFixture, gql_schema

UNKNOWN_UUID: Final = UUID("a7233ac1-03b3-47d9-9dfb-95d9b3659d74")
UUID1: Final = UUID("4b6b1145-933d-47bd-ba7e-279751bb8f7b")
UUID2: Final = UUID("b77f6851-058c-4847-90ad-a63ebb935b43")
UUID3: Final = UUID("fb79a130-798e-4e59-8230-e64cbc49a0b5")


class IntegrationFixture(GQLFixture, DatabaseFixture):
    def __init__(
        self,
        schema: GraphQLSchema,
        db: Database,
    ) -> None:
        GQLFixture.__init__(self, schema)
        DatabaseFixture.__init__(self, db)


@pytest.fixture
def fix(
    gql_schema: GraphQLSchema,
    db_o: Database,
    mocker: MockerFixture,
) -> IntegrationFixture:
    @asynccontextmanager
    async def open_db(_: object) -> AsyncGenerator[Database]:
        yield db_o

    mocker.patch("hej.db.open_db", open_db)
    return IntegrationFixture(gql_schema, db_o)


OLD_LAST_CHANGED: Final = "2000-01-01T12:00:00Z"


async def note_last_changed(fix: IntegrationFixture, uuid: UUID) -> str:
    rows = await fix.select_all_rows("notes")
    return cast(
        str,
        next(r["last_changed"] for r in rows if r["uuid"] == str(uuid)),
    )


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


class TestLabels:
    async def test_all_labels(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(
            uuid=UUID1,
            name="Work",
            slug="work",
            color="#d73a4a",
            favorite=True,
        )
        await fix.insert_label(
            uuid=UUID2, name="Home Improvement", slug="home-improvement"
        )
        response = await fix.gql(
            """
                query {
                    labels {
                        uuid
                        name
                        slug
                        color
                        favorite
                    }
                }
            """
        )
        labels: list[dict[str, Any]] = response["labels"]
        labels.sort(key=lambda label: label["name"])
        assert labels == [
            {
                "uuid": str(UUID2),
                "name": "Home Improvement",
                "slug": "home-improvement",
                "color": "#000000",
                "favorite": False,
            },
            {
                "uuid": str(UUID1),
                "name": "Work",
                "slug": "work",
                "color": "#d73a4a",
                "favorite": True,
            },
        ]

    async def test_no_labels(self, fix: IntegrationFixture) -> None:
        response = await fix.gql("query { labels { uuid } }")
        assert response == {"labels": []}

    async def test_favorite_labels(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="Work", favorite=True)
        await fix.insert_label(uuid=UUID2, name="Home", favorite=False)
        await fix.insert_label(uuid=UUID3, name="Garden", favorite=True)
        response = await fix.gql("query { labels(favorites: true) { uuid } }")
        uuids = {label["uuid"] for label in response["labels"]}
        assert uuids == {str(UUID1), str(UUID3)}

    async def test_favorites_false(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="Work", favorite=True)
        await fix.insert_label(uuid=UUID2, name="Home", favorite=False)
        response = await fix.gql("query { labels(favorites: false) { uuid } }")
        uuids = {label["uuid"] for label in response["labels"]}
        assert uuids == {str(UUID1), str(UUID2)}

    async def test_favorites_and_slug(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="Work", favorite=True)
        errors = await fix.gql_errors(
            'query { labels(slug: "work", favorites: true) { uuid } }'
        )
        assert len(errors) == 1
        assert "mutually exclusive" in errors[0]["message"]

    async def test_label_by_slug(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="Work", slug="work")
        await fix.insert_label(
            uuid=UUID2, name="Home Improvement", slug="home-improvement"
        )
        response = await fix.gql(
            'query { labels(slug: "home-improvement") { uuid name } }'
        )
        assert response == {
            "labels": [{"uuid": str(UUID2), "name": "Home Improvement"}]
        }

    async def test_unknown_slug(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="Work", slug="work")
        response = await fix.gql('query { labels(slug: "garden") { uuid } }')
        assert response == {"labels": []}


GQL_CREATE_LABEL: Final = """
    mutation($name: String!, $color: Color!, $favorite: Boolean) {
        result: createLabel(name: $name, color: $color, favorite: $favorite) {
            __typename
            ... on Label {
                uuid
                name
                slug
                color
                favorite
            }
            ... on UserError {
                message
            }
        }
    }
"""


async def create_label(
    fix: IntegrationFixture,
    name: str,
    color: str = "#d73a4a",
    favorite: bool | None = None,
) -> dict[str, Any]:
    variables: dict[str, Any] = {"name": name, "color": color}
    if favorite is not None:
        variables["favorite"] = favorite
    response = await fix.gql(GQL_CREATE_LABEL, variables)
    return cast(dict[str, Any], response["result"])


class TestCreateLabel:
    async def test_create(self, fix: IntegrationFixture) -> None:
        result = await create_label(fix, "Home Improvement", "#d73a4a")
        assert_json_subset(
            {
                "__typename": "Label",
                "name": "Home Improvement",
                "slug": "home-improvement",
                "color": "#d73a4a",
                "favorite": False,
            },
            result,
        )
        await fix.assert_only_row_equals(
            "labels",
            {
                "uuid": result["uuid"],
                "name": "Home Improvement",
                "slug": "home-improvement",
                "color": "#d73a4a",
                "favorite": False,
            },
        )

    async def test_favorite(self, fix: IntegrationFixture) -> None:
        result = await create_label(fix, "Work", favorite=True)
        assert result["favorite"] is True
        await fix.assert_only_row_equals("labels", {"favorite": True})

    async def test_color_is_lowercased(self, fix: IntegrationFixture) -> None:
        result = await create_label(fix, "Work", "#D73A4A")
        assert result["color"] == "#d73a4a"
        await fix.assert_only_row_equals("labels", {"color": "#d73a4a"})

    async def test_invalid_color(self, fix: IntegrationFixture) -> None:
        await fix.gql_errors(
            GQL_CREATE_LABEL, {"name": "Work", "color": "red"}
        )
        assert await fix.select_all_rows("labels") == []

    async def test_strip_name(self, fix: IntegrationFixture) -> None:
        result = await create_label(fix, "  Work \t")
        assert result["name"] == "Work"
        assert result["slug"] == "work"

    @pytest.mark.parametrize("name", ["", "   ", "\t\n"])
    async def test_blank_name(
        self, fix: IntegrationFixture, name: str
    ) -> None:
        result = await create_label(fix, name)
        assert result["__typename"] == "ValueError"
        assert await fix.select_all_rows("labels") == []

    async def test_duplicate_name(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="Work", slug="work")
        result = await create_label(fix, "work")
        assert result["__typename"] == "DuplicateItemError"
        await fix.assert_only_row_equals("labels", {"uuid": UUID1})

    async def test_slug(self, fix: IntegrationFixture) -> None:
        result = await create_label(fix, "Küche")
        assert result["slug"] == "kueche"

    async def test_slug_collision(self, fix: IntegrationFixture) -> None:
        r1 = await create_label(fix, "C")
        r2 = await create_label(fix, "C++")
        r3 = await create_label(fix, "C#")
        assert [r1["slug"], r2["slug"], r3["slug"]] == ["c", "c-2", "c-3"]


GQL_UPDATE_LABEL: Final = """
    mutation(
        $uuid: ID!, $name: String, $color: Color, $favorite: Boolean
    ) {
        result: updateLabel(
            uuid: $uuid, name: $name, color: $color, favorite: $favorite
        ) {
            __typename
            ... on Label {
                uuid
                name
                slug
                color
                favorite
            }
            ... on UserError {
                message
            }
            ... on UnknownItemError {
                missingType
            }
        }
    }
"""


async def update_label(
    fix: IntegrationFixture, uuid: UUID | str, **fields: Any
) -> dict[str, Any]:
    response = await fix.gql(GQL_UPDATE_LABEL, {"uuid": str(uuid), **fields})
    return cast(dict[str, Any], response["result"])


class TestUpdateLabel:
    async def test_rename(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(
            uuid=UUID1, name="Work", color="#d73a4a", favorite=True
        )
        result = await update_label(fix, UUID1, name="Home Improvement")
        assert result == {
            "__typename": "Label",
            "uuid": str(UUID1),
            "name": "Home Improvement",
            "slug": "home-improvement",
            "color": "#d73a4a",
            "favorite": True,
        }
        await fix.assert_only_row_equals(
            "labels",
            {
                "uuid": UUID1,
                "name": "Home Improvement",
                "slug": "home-improvement",
                "color": "#d73a4a",
                "favorite": True,
            },
        )

    async def test_strip_name(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="Work")
        result = await update_label(fix, UUID1, name="  Garden \t")
        assert result["name"] == "Garden"
        assert result["slug"] == "garden"

    async def test_slug(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="Work")
        result = await update_label(fix, UUID1, name="Küche")
        assert result["slug"] == "kueche"

    async def test_change_case(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="work", slug="work")
        result = await update_label(fix, UUID1, name="Work")
        assert result["__typename"] == "Label"
        assert result["name"] == "Work"
        assert result["slug"] == "work"

    async def test_slug_collision(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="C", slug="c")
        await fix.insert_label(uuid=UUID2, name="Work", slug="work")
        result = await update_label(fix, UUID2, name="C++")
        assert result["slug"] == "c-2"

    async def test_keep_own_suffixed_slug(
        self, fix: IntegrationFixture
    ) -> None:
        await fix.insert_label(uuid=UUID1, name="C", slug="c")
        await fix.insert_label(uuid=UUID2, name="C++", slug="c-2")
        result = await update_label(fix, UUID2, name="C#")
        assert result["slug"] == "c-2"

    async def test_change_color(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(
            uuid=UUID1, name="Work", slug="work", color="#000000"
        )
        result = await update_label(fix, UUID1, color="#D73A4A")
        assert_json_subset(
            {"name": "Work", "slug": "work", "color": "#d73a4a"}, result
        )
        await fix.assert_only_row_equals("labels", {"color": "#d73a4a"})

    async def test_invalid_color(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="Work", color="#000000")
        await fix.gql_errors(
            GQL_UPDATE_LABEL, {"uuid": str(UUID1), "color": "red"}
        )
        await fix.assert_only_row_equals("labels", {"color": "#000000"})

    @pytest.mark.parametrize("favorite", [True, False])
    async def test_change_favorite(
        self, fix: IntegrationFixture, favorite: bool
    ) -> None:
        await fix.insert_label(uuid=UUID1, name="Work", favorite=not favorite)
        result = await update_label(fix, UUID1, favorite=favorite)
        assert_json_subset({"name": "Work", "favorite": favorite}, result)
        await fix.assert_only_row_equals("labels", {"favorite": favorite})

    async def test_no_changes(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(
            uuid=UUID1, name="Work", slug="work", color="#d73a4a"
        )
        result = await update_label(fix, UUID1)
        assert_json_subset(
            {
                "__typename": "Label",
                "name": "Work",
                "slug": "work",
                "color": "#d73a4a",
                "favorite": False,
            },
            result,
        )

    @pytest.mark.parametrize("name", ["", "   "])
    async def test_blank_name(
        self, fix: IntegrationFixture, name: str
    ) -> None:
        await fix.insert_label(uuid=UUID1, name="Work")
        result = await update_label(fix, UUID1, name=name)
        assert result["__typename"] == "ValueError"
        await fix.assert_only_row_equals("labels", {"name": "Work"})

    async def test_duplicate_name(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="Work")
        await fix.insert_label(uuid=UUID2, name="Garden")
        result = await update_label(fix, UUID2, name="work")
        assert result["__typename"] == "DuplicateItemError"
        await fix.assert_one_row_equals(
            "labels", {"uuid": UUID2, "name": "Garden"}
        )

    @pytest.mark.parametrize(
        "uuid", ["a7233ac1-03b3-47d9-9dfb-95d9b3659d74", "not-a-uuid"]
    )
    async def test_unknown_label(
        self, fix: IntegrationFixture, uuid: str
    ) -> None:
        await fix.insert_label(uuid=UUID1, name="Work")
        result = await update_label(fix, uuid, name="Garden")
        assert_json_subset(
            {"__typename": "UnknownItemError", "missingType": "Label"},
            result,
        )
        await fix.assert_only_row_equals("labels", {"name": "Work"})


GQL_DELETE_LABEL: Final = """
    mutation($uuid: ID!) {
        result: deleteLabel(uuid: $uuid)
    }
"""


class TestDeleteLabel:
    async def test_delete(self, fix: IntegrationFixture) -> None:
        await fix.insert_label(uuid=UUID1, name="Work")
        await fix.insert_label(uuid=UUID2, name="Garden")
        response = await fix.gql(GQL_DELETE_LABEL, {"uuid": str(UUID1)})
        assert response == {"result": True}
        await fix.assert_only_row_equals("labels", {"uuid": UUID2})

    async def test_remove_from_notes(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_note(uuid=UUID2)
        await fix.insert_label(uuid=UUID1, name="Work")
        await fix.insert_label(uuid=UUID2, name="Garden")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID1)
        await fix.insert_note_label(note_uuid=UUID2, label_uuid=UUID1)
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID2)
        response = await fix.gql(GQL_DELETE_LABEL, {"uuid": str(UUID1)})
        assert response == {"result": True}
        await fix.assert_only_row_equals(
            "note_labels", {"note_uuid": UUID1, "label_uuid": UUID2}
        )
        assert len(await fix.select_all_rows("notes")) == 2

    @pytest.mark.parametrize(
        "uuid", ["a7233ac1-03b3-47d9-9dfb-95d9b3659d74", "not-a-uuid"]
    )
    async def test_unknown_label(
        self, fix: IntegrationFixture, uuid: str
    ) -> None:
        await fix.insert_label(uuid=UUID1, name="Work")
        response = await fix.gql(GQL_DELETE_LABEL, {"uuid": uuid})
        assert response == {"result": False}
        await fix.assert_only_row_equals("labels", {"uuid": UUID1})

    async def test_last_changed_not_updated(
        self, fix: IntegrationFixture
    ) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_note(uuid=UUID2)
        await fix.insert_label(uuid=UUID1, name="Work")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID1)
        await fix.insert_note_label(note_uuid=UUID2, label_uuid=UUID1)
        await fix.gql(GQL_DELETE_LABEL, {"uuid": str(UUID1)})
        assert await note_last_changed(fix, UUID1) == OLD_LAST_CHANGED
        assert await note_last_changed(fix, UUID2) == OLD_LAST_CHANGED


GQL_ATTACH_NOTE_LABEL: Final = """
    mutation($noteUUID: ID!, $labelUUID: ID!) {
        result: attachNoteLabel(noteUUID: $noteUUID, labelUUID: $labelUUID) {
            __typename
            ... on Note {
                uuid
            }
            ... on UnknownItemError {
                message
                missingType
            }
        }
    }
"""


async def attach_note_label(
    fix: IntegrationFixture, note_uuid: UUID | str, label_uuid: UUID | str
) -> dict[str, Any]:
    response = await fix.gql(
        GQL_ATTACH_NOTE_LABEL,
        {"noteUUID": str(note_uuid), "labelUUID": str(label_uuid)},
    )
    return cast(dict[str, Any], response["result"])


class TestAttachNoteLabel:
    async def test_attach(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_note(uuid=UUID2)
        await fix.insert_label(uuid=UUID3, name="Work")
        result = await attach_note_label(fix, UUID2, UUID3)
        assert result == {"__typename": "Note", "uuid": str(UUID2)}
        await fix.assert_only_row_equals(
            "note_labels", {"note_uuid": UUID2, "label_uuid": UUID3}
        )

    async def test_attach_second_label(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID2, name="Work")
        await fix.insert_label(uuid=UUID3, name="Garden")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID2)
        result = await attach_note_label(fix, UUID1, UUID3)
        assert result["__typename"] == "Note"
        await fix.assert_rows_equal(
            "note_labels",
            [
                {"note_uuid": UUID1, "label_uuid": UUID2},
                {"note_uuid": UUID1, "label_uuid": UUID3},
            ],
        )

    async def test_already_attached(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID2, name="Work")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID2)
        result = await attach_note_label(fix, UUID1, UUID2)
        assert result == {"__typename": "Note", "uuid": str(UUID1)}
        await fix.assert_only_row_equals(
            "note_labels", {"note_uuid": UUID1, "label_uuid": UUID2}
        )

    @pytest.mark.parametrize("note_uuid", [str(UNKNOWN_UUID), "not-a-uuid"])
    async def test_unknown_note(
        self, fix: IntegrationFixture, note_uuid: str
    ) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID2, name="Work")
        result = await attach_note_label(fix, note_uuid, UUID2)
        assert_json_subset(
            {"__typename": "UnknownItemError", "missingType": "Note"}, result
        )
        assert await fix.select_all_rows("note_labels") == []

    @pytest.mark.parametrize("label_uuid", [str(UNKNOWN_UUID), "not-a-uuid"])
    async def test_unknown_label(
        self, fix: IntegrationFixture, label_uuid: str
    ) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID2, name="Work")
        result = await attach_note_label(fix, UUID1, label_uuid)
        assert_json_subset(
            {"__typename": "UnknownItemError", "missingType": "Label"}, result
        )
        assert await fix.select_all_rows("note_labels") == []

    async def test_last_changed(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_note(uuid=UUID2)
        await fix.insert_label(uuid=UUID1, name="Work")
        response = await fix.gql(
            """
                mutation($n: ID!, $l: ID!) {
                    attachNoteLabel(noteUUID: $n, labelUUID: $l) {
                        ... on Note { lastChanged }
                    }
                }
            """,
            {"n": str(UUID1), "l": str(UUID1)},
        )
        last_changed = await note_last_changed(fix, UUID1)
        assert last_changed > OLD_LAST_CHANGED
        assert response["attachNoteLabel"]["lastChanged"] == last_changed
        assert await note_last_changed(fix, UUID2) == OLD_LAST_CHANGED

    async def test_last_changed_already_attached(
        self, fix: IntegrationFixture
    ) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID1, name="Work")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID1)
        await attach_note_label(fix, UUID1, UUID1)
        assert await note_last_changed(fix, UUID1) == OLD_LAST_CHANGED


GQL_DETACH_NOTE_LABEL: Final = """
    mutation($noteUUID: ID!, $labelUUID: ID!) {
        result: detachNoteLabel(noteUUID: $noteUUID, labelUUID: $labelUUID) {
            __typename
            ... on Note {
                uuid
            }
            ... on UnknownItemError {
                message
                missingType
            }
        }
    }
"""


async def detach_note_label(
    fix: IntegrationFixture, note_uuid: UUID | str, label_uuid: UUID | str
) -> dict[str, Any]:
    response = await fix.gql(
        GQL_DETACH_NOTE_LABEL,
        {"noteUUID": str(note_uuid), "labelUUID": str(label_uuid)},
    )
    return cast(dict[str, Any], response["result"])


class TestDetachNoteLabel:
    async def test_detach(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_note(uuid=UUID2)
        await fix.insert_label(uuid=UUID2, name="Work")
        await fix.insert_label(uuid=UUID3, name="Garden")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID2)
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID3)
        await fix.insert_note_label(note_uuid=UUID2, label_uuid=UUID2)
        result = await detach_note_label(fix, UUID1, UUID2)
        assert result == {"__typename": "Note", "uuid": str(UUID1)}
        await fix.assert_rows_equal(
            "note_labels",
            [
                {"note_uuid": UUID1, "label_uuid": UUID3},
                {"note_uuid": UUID2, "label_uuid": UUID2},
            ],
        )
        assert len(await fix.select_all_rows("labels")) == 2

    async def test_not_attached(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID2, name="Work")
        await fix.insert_label(uuid=UUID3, name="Garden")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID3)
        result = await detach_note_label(fix, UUID1, UUID2)
        assert result == {"__typename": "Note", "uuid": str(UUID1)}
        await fix.assert_only_row_equals(
            "note_labels", {"note_uuid": UUID1, "label_uuid": UUID3}
        )

    @pytest.mark.parametrize("note_uuid", [UNKNOWN_UUID, "not-a-uuid"])
    async def test_unknown_note(
        self, fix: IntegrationFixture, note_uuid: UUID | str
    ) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID2, name="Work")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID2)
        result = await detach_note_label(fix, note_uuid, UUID2)
        assert_json_subset(
            {"__typename": "UnknownItemError", "missingType": "Note"}, result
        )
        await fix.assert_only_row_equals(
            "note_labels", {"note_uuid": UUID1, "label_uuid": UUID2}
        )

    @pytest.mark.parametrize("label_uuid", [UNKNOWN_UUID, "not-a-uuid"])
    async def test_unknown_label(
        self, fix: IntegrationFixture, label_uuid: UUID | str
    ) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID2, name="Work")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID2)
        result = await detach_note_label(fix, UUID1, label_uuid)
        assert_json_subset(
            {"__typename": "UnknownItemError", "missingType": "Label"}, result
        )
        await fix.assert_only_row_equals(
            "note_labels", {"note_uuid": UUID1, "label_uuid": UUID2}
        )

    async def test_last_changed(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_note(uuid=UUID2)
        await fix.insert_label(uuid=UUID1, name="Work")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID1)
        await fix.insert_note_label(note_uuid=UUID2, label_uuid=UUID1)
        await detach_note_label(fix, UUID1, UUID1)
        assert await note_last_changed(fix, UUID1) > OLD_LAST_CHANGED
        assert await note_last_changed(fix, UUID2) == OLD_LAST_CHANGED

    async def test_last_changed_not_attached(
        self, fix: IntegrationFixture
    ) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID1, name="Work")
        await detach_note_label(fix, UUID1, UUID1)
        assert await note_last_changed(fix, UUID1) == OLD_LAST_CHANGED


class TestNoteLabels:
    async def test_all_notes(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1, title="Note #1")
        await fix.insert_note(uuid=UUID2, title="Note #2")
        await fix.insert_note(uuid=UUID3, title="Note #3")
        await fix.insert_label(
            uuid=UUID1, name="Work", slug="work", color="#d73a4a"
        )
        await fix.insert_label(uuid=UUID2, name="Garden", slug="garden")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID1)
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID2)
        await fix.insert_note_label(note_uuid=UUID2, label_uuid=UUID2)
        response = await fix.gql(
            """
                query {
                    notes {
                        title
                        labels { uuid name slug color favorite }
                    }
                }
            """
        )
        notes = {n["title"]: n["labels"] for n in response["notes"]}
        work = {
            "uuid": str(UUID1),
            "name": "Work",
            "slug": "work",
            "color": "#d73a4a",
            "favorite": False,
        }
        garden = {
            "uuid": str(UUID2),
            "name": "Garden",
            "slug": "garden",
            "color": "#000000",
            "favorite": False,
        }
        assert sorted(notes["Note #1"], key=lambda lbl: lbl["name"]) == [
            garden,
            work,
        ]
        assert notes["Note #2"] == [garden]
        assert notes["Note #3"] == []

    async def test_single_note(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_note(uuid=UUID2)
        await fix.insert_label(uuid=UUID1, name="Work")
        await fix.insert_label(uuid=UUID2, name="Garden")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID1)
        await fix.insert_note_label(note_uuid=UUID2, label_uuid=UUID2)
        response = await fix.gql(
            f'query {{ notes(uuid: "{UUID2}") {{ labels {{ name }} }} }}'
        )
        assert response == {"notes": [{"labels": [{"name": "Garden"}]}]}

    async def test_attach_returns_labels(
        self, fix: IntegrationFixture
    ) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID1, name="Work")
        response = await fix.gql(
            """
                mutation($n: ID!, $l: ID!) {
                    attachNoteLabel(noteUUID: $n, labelUUID: $l) {
                        ... on Note { labels { name } }
                    }
                }
            """,
            {"n": str(UUID1), "l": str(UUID1)},
        )
        assert response == {"attachNoteLabel": {"labels": [{"name": "Work"}]}}

    async def test_detach_returns_labels(
        self, fix: IntegrationFixture
    ) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID1, name="Work")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID1)
        response = await fix.gql(
            """
                mutation($n: ID!, $l: ID!) {
                    detachNoteLabel(noteUUID: $n, labelUUID: $l) {
                        ... on Note { labels { name } }
                    }
                }
            """,
            {"n": str(UUID1), "l": str(UUID1)},
        )
        assert response == {"detachNoteLabel": {"labels": []}}

    async def test_multiple_mutations(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID1, name="Work")
        await fix.insert_label(uuid=UUID2, name="Garden")
        response = await fix.gql(
            """
                mutation($n: ID!, $l1: ID!, $l2: ID!) {
                    a: attachNoteLabel(noteUUID: $n, labelUUID: $l1) {
                        ... on Note { labels { name } }
                    }
                    b: attachNoteLabel(noteUUID: $n, labelUUID: $l2) {
                        ... on Note { labels { name } }
                    }
                    c: updateLabel(uuid: $l1, name: "Office") {
                        __typename
                    }
                    d: detachNoteLabel(noteUUID: $n, labelUUID: $l2) {
                        ... on Note { labels { name } }
                    }
                }
            """,
            {"n": str(UUID1), "l1": str(UUID1), "l2": str(UUID2)},
        )
        assert response["a"] == {"labels": [{"name": "Work"}]}
        b_names = sorted(label["name"] for label in response["b"]["labels"])
        assert b_names == ["Garden", "Work"]
        assert response["d"] == {"labels": [{"name": "Office"}]}

    async def test_deleted_label(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID1, name="Work")
        await fix.insert_label(uuid=UUID2, name="Garden")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID1)
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID2)
        response = await fix.gql(
            """
                mutation($n: ID!, $l1: ID!, $l2: ID!) {
                    a: detachNoteLabel(noteUUID: $n, labelUUID: $l2) {
                        ... on Note { labels { name } }
                    }
                    b: deleteLabel(uuid: $l1)
                    c: attachNoteLabel(noteUUID: $n, labelUUID: $l2) {
                        ... on Note { labels { name } }
                    }
                }
            """,
            {"n": str(UUID1), "l1": str(UUID1), "l2": str(UUID2)},
        )
        assert response == {
            "a": {"labels": [{"name": "Work"}]},
            "b": True,
            "c": {"labels": [{"name": "Garden"}]},
        }


class TestLabelNotes:
    async def test_notes(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1, title="Note #1")
        await fix.insert_note(uuid=UUID2, title="Note #2")
        await fix.insert_note(uuid=UUID3, title="Note #3")
        await fix.insert_label(uuid=UUID1, name="Work", slug="work")
        await fix.insert_label(uuid=UUID2, name="Garden", slug="garden")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID1)
        await fix.insert_note_label(note_uuid=UUID3, label_uuid=UUID1)
        await fix.insert_note_label(note_uuid=UUID2, label_uuid=UUID2)
        response = await fix.gql(
            """
                query {
                    labels(slug: "work") {
                        noteCount
                        notes { uuid title }
                    }
                }
            """
        )
        [label] = response["labels"]
        assert label["noteCount"] == 2
        notes = sorted(label["notes"], key=lambda n: n["title"])
        assert notes == [
            {"uuid": str(UUID1), "title": "Note #1"},
            {"uuid": str(UUID3), "title": "Note #3"},
        ]

    async def test_no_notes(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_label(uuid=UUID1, name="Work", slug="work")
        response = await fix.gql(
            'query { labels(slug: "work") { noteCount notes { uuid } } }'
        )
        assert response == {"labels": [{"noteCount": 0, "notes": []}]}

    async def test_note_count_of_all_labels(
        self, fix: IntegrationFixture
    ) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_note(uuid=UUID2)
        await fix.insert_label(uuid=UUID1, name="Work")
        await fix.insert_label(uuid=UUID2, name="Garden")
        await fix.insert_label(uuid=UUID3, name="Home")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID1)
        await fix.insert_note_label(note_uuid=UUID2, label_uuid=UUID1)
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID2)
        response = await fix.gql("query { labels { name noteCount } }")
        counts = {lbl["name"]: lbl["noteCount"] for lbl in response["labels"]}
        assert counts == {"Work": 2, "Garden": 1, "Home": 0}

    async def test_attach_invalidates(self, fix: IntegrationFixture) -> None:
        await fix.insert_note(uuid=UUID1)
        await fix.insert_note(uuid=UUID2)
        await fix.insert_label(uuid=UUID1, name="Work")
        response = await fix.gql(
            """
                mutation($n1: ID!, $n2: ID!, $l: ID!) {
                    a: attachNoteLabel(noteUUID: $n1, labelUUID: $l) {
                        ... on Note { labels { noteCount } }
                    }
                    b: attachNoteLabel(noteUUID: $n2, labelUUID: $l) {
                        ... on Note { labels { noteCount } }
                    }
                    c: detachNoteLabel(noteUUID: $n1, labelUUID: $l) {
                        ... on Note { labels { noteCount } }
                    }
                }
            """,
            {"n1": str(UUID1), "n2": str(UUID2), "l": str(UUID1)},
        )
        assert response == {
            "a": {"labels": [{"noteCount": 1}]},
            "b": {"labels": [{"noteCount": 2}]},
            "c": {"labels": []},
        }

    async def test_update_note_invalidates(
        self, fix: IntegrationFixture
    ) -> None:
        await fix.insert_note(uuid=UUID1, title="Old")
        await fix.insert_label(uuid=UUID1, name="Work")
        await fix.insert_note_label(note_uuid=UUID1, label_uuid=UUID1)
        response = await fix.gql(
            """
                mutation($n: ID!) {
                    a: updateNote(uuid: $n, title: "New") {
                        labels { notes { title } }
                    }
                    b: markNoteAsFavorite(uuid: $n, favorite: true) {
                        labels { notes { favorite } }
                    }
                }
            """,
            {"n": str(UUID1)},
        )
        assert response == {
            "a": {"labels": [{"notes": [{"title": "New"}]}]},
            "b": {"labels": [{"notes": [{"favorite": True}]}]},
        }
