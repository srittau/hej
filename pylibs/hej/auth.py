import hmac
import os

from starlette.requests import Request

from hej.exc import AuthenticationError, CookieUnsetError

_COOKIE_NAME = "HejSessionKey"


def session_key() -> str:
    try:
        return os.environ["HEJ_SESSION_KEY"]
    except KeyError:
        raise RuntimeError("environment variable 'HEJ_SESSION_KEY' unset")


async def authenticate(request: Request) -> None:
    key = request.cookies.get(_COOKIE_NAME)
    if key is None:
        raise CookieUnsetError(_COOKIE_NAME)
    if not check_session_key(key):
        raise AuthenticationError("wrong session key")


def check_session_key(key: str) -> bool:
    return hmac.compare_digest(key, session_key())
