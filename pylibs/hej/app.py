import logging
import os
import sys
from pathlib import Path

from starlette.applications import Starlette
from starlette.routing import Mount
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


def create_app() -> Starlette:
    app = Starlette(
        routes=[
            Mount("/graphql", gql_app()),
            Mount(
                "/",
                StaticFiles(directory=static_path(), html=True),
                name="static",
            ),
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
