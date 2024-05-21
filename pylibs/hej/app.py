import contextlib
import logging
import os
import sys
from collections.abc import AsyncGenerator, Callable
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

LOGGER = logging.getLogger(__name__)


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


@contextlib.asynccontextmanager
async def lifespan(app: Starlette) -> AsyncGenerator[None, None]:
    logging.basicConfig(level=logging.INFO)
    LOGGER.info(f"Starting app with PID {os.getpid()}")
    try:
        migrate_db()
    except DBMigrationError:
        sys.exit(1)
    yield


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
        lifespan=lifespan,
        debug=debug(),
    )
    return app


app = create_app()
