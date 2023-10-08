import logging
import os
from pathlib import Path

from starlette.applications import Starlette
from starlette.staticfiles import StaticFiles

from .db import migrate_db
from .debug import debug
from .gql import app as gql_app


def static_path() -> Path:
    path = os.getenv("HEJ_STATIC_PATH")
    if path is not None:
        return Path(path)
    return Path("dist")


def create_app() -> Starlette:
    app = Starlette(debug=debug())
    app.mount("/graphql", gql_app)
    app.mount(
        "/", StaticFiles(directory=static_path(), html=True), name="static"
    )
    return app


logging.basicConfig(level=logging.INFO)
migrate_db()
app = create_app()
