import re
from typing import Final, NewType, TypeIs

Color = NewType("Color", str)

COLOR_RE: Final = re.compile(r"^\#[0-9a-fA-F]{6}$")


def is_rgb_color(color: str) -> TypeIs[Color]:
    return COLOR_RE.fullmatch(color) is not None


def validate_rgb_color(color: str) -> None:
    if not is_rgb_color(color):
        raise ValueError(f"invalid color string: {color!r}")
