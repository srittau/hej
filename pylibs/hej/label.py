from dataclasses import dataclass
from uuid import UUID

from hej.colors import Color


@dataclass
class Label:
    uuid: UUID
    name: str
    slug: str
    color: Color
    favorite: bool = False


def normalize_label_name(name: str) -> str:
    """Strip surrounding whitespace from a label name.

    Raise ValueError if the name is empty or only whitespace.
    """
    name = name.strip()
    if not name:
        raise ValueError("label name must not be empty")
    return name
