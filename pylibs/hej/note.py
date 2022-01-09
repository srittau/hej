import datetime
from dataclasses import dataclass
from uuid import UUID


@dataclass
class Note:
    uuid: UUID
    title: str
    text: str
    last_changed: datetime.datetime
