from starlette.applications import Starlette

from .debug import debug
from .gql import app as gql_app

app = Starlette(debug=debug())
app.mount("/graphql", gql_app)
