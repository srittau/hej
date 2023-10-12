class HejException(Exception):
    pass


class AuthorizationError(HejException):
    extensions = {"code": "UNAUTHENTICATED"}


class CookieUnsetError(AuthorizationError):
    def __init__(self, cookie_name: str) -> None:
        super().__init__(f"authentication cookie '{cookie_name}' not set")
        self.cookie_name = cookie_name


class AuthenticationError(AuthorizationError):
    pass


class UnknownItemError(HejException):
    def __init__(self, table: str, id: object) -> None:
        super().__init__(f"unknown item '{id}' in table '{table}'")
        self.table = table
        self.id = id


class DBMigrationError(HejException):
    pass
