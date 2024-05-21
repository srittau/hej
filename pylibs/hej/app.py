import logging
import os
import sys
from collections.abc import Callable
from pathlib import Path

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import FileResponse
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles

from .db import migrate_db
from .debug import debug
from .exc import DBMigrationError
from .gql import create_app as gql_app


def static_path() -> Path:
    path = os.getenv("HEJ_STATIC_PATH")
    if path is not None:
        return Path(path)
    return Path("dist")


def file_app(
    path: str,
) -> Callable[[Request], FileResponse]:
    def file_app(request: Request) -> FileResponse:
        return FileResponse(static_path() / path)

    return file_app


def create_app() -> Starlette:
    app = Starlette(
        routes=[
            Mount("/graphql", gql_app()),
            Mount(
                "/assets",
                StaticFiles(directory=static_path() / "assets"),
                name="assets",
            ),
            Mount(
                "/images",
                StaticFiles(directory=static_path() / "images"),
            ),
            Route("/manifest.json", file_app("manifest.json")),
            Route("/robots.txt", file_app("robots.txt")),
            Route("/{p:path}", file_app("index.html")),
        ],
        debug=debug(),
    )
    return app


logging.basicConfig(level=logging.INFO)
try:
    migrate_db()
except DBMigrationError:
    sys.exit(1)
app = create_app()
