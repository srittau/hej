import datetime
from dataclasses import dataclass
from uuid import UUID


@dataclass
class Note:
    uuid: UUID
    title: str
    text: str
    creation_date: datetime.datetime
    last_changed: datetime.datetime
