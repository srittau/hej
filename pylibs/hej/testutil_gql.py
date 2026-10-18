from typing import Any, cast

import pytest
from ariadne import graphql
from graphql import GraphQLSchema
from starlette.requests import Request
from starlette.types import Scope

from .gql import bind_schema


class GQLFixture:
    def __init__(self, schema: GraphQLSchema) -> None:
        self.schema = schema

    async def gql(
        self, query: str, variables: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        success, response = await self._execute(query, variables)
        assert success, "GraphQL query failed"
        errors = response.get("errors", [])
        assert len(errors) == 0, f"Unexpected error: {errors[0]['message']}"
        assert "data" in response
        return cast(dict[str, Any], response["data"])

    async def gql_errors(
        self, query: str, variables: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """Execute a query that is expected to fail and return the errors."""
        _, response = await self._execute(query, variables)
        errors = cast(list[dict[str, Any]], response.get("errors", []))
        assert len(errors) > 0, "Expected GraphQL errors, but got none"
        return errors

    async def _execute(
        self, query: str, variables: dict[str, Any] | None
    ) -> tuple[bool, dict[str, Any]]:
        request = Request(_scope())
        body: dict[str, Any] = {"query": query}
        if variables is not None:
            body["variables"] = variables
        return await graphql(
            self.schema, body, context_value={"request": request, "auth": True}
        )


def _scope() -> Scope:
    return {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.3"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/graphql",
    }


@pytest.fixture(scope="session")
def gql_schema() -> GraphQLSchema:
    return bind_schema()
