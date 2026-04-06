import datetime
from dataclasses import dataclass
from uuid import UUID


@dataclass
class Note:
    uuid: UUID
    title: str
    text: str
    favorite: bool
    creation_date: datetime.datetime
    last_changed: datetime.datetime

    def __post_init__(self) -> None:
        if self.creation_date.tzinfo is None:
            raise ValueError(
                f"creation_date {self.creation_date} has no timezone"
            )
        elif self.creation_date.tzinfo != datetime.UTC:
            raise ValueError(
                f"creation_date {self.creation_date} has non-UTC timezone"
            )

        if self.last_changed.tzinfo is None:
            raise ValueError(
                f"last_changed {self.last_changed} has no timezone"
            )
        elif self.last_changed.tzinfo != datetime.UTC:
            raise ValueError(
                f"last_changed {self.last_changed} has non-UTC timezone"
            )
