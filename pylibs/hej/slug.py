import unicodedata
from typing import Final

from slugify import slugify as _slugify

FALLBACK_SLUG: Final = "label"

# Transliterate German umlauts using the German convention, instead of
# just dropping the diaeresis.
_SLUG_REPLACEMENTS: Final = [
    ["ä", "ae"],
    ["ö", "oe"],
    ["ü", "ue"],
    ["Ä", "Ae"],
    ["Ö", "Oe"],
    ["Ü", "Ue"],
]


def slugify(name: str) -> str:
    """Return a URL slug for a name."""
    # Compose decomposed characters (e.g. "u" + combining diaeresis) so
    # that the replacements match.
    name = unicodedata.normalize("NFC", name)
    return _slugify(name, replacements=_SLUG_REPLACEMENTS) or FALLBACK_SLUG
