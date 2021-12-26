class UnknownItemError(Exception):
    def __init__(self, table: str, id: object) -> None:
        super().__init__(f"unknown item '{id}' in table '{table}'")
        self.table = table
        self.id = id
