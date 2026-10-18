import pytest

from .slug import slugify


@pytest.mark.parametrize(
    "name, slug",
    [
        ("Work", "work"),
        ("Home Improvement", "home-improvement"),
        ("  Lots   of\tspace ", "lots-of-space"),
        ("C++", "c"),
        ("v1.2 Notes", "v1-2-notes"),
        ("Küche & Straße", "kueche-strasse"),
        ("ÄÖÜ äöü", "aeoeue-aeoeue"),
        ("Küche", "kueche"),  # decomposed umlaut
        ("Café", "cafe"),
        ("日本", "ri-ben"),
    ],
)
def test_slugify(name: str, slug: str) -> None:
    assert slugify(name) == slug


@pytest.mark.parametrize("name", ["", "!!!", "🙂"])
def test_slugify_fallback(name: str) -> None:
    assert slugify(name) == "label"
