"""Sanitize untrusted HTML for help/guides content."""
from __future__ import annotations

import bleach

# Conservative allowlist for admin-authored help guides.
ALLOWED_TAGS = frozenset({
    "a", "abbr", "b", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3",
    "h4", "h5", "h6", "hr", "i", "li", "ol", "p", "pre", "span", "strong",
    "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
})
ALLOWED_ATTRIBUTES = {
    "a": ["href", "title", "rel", "target"],
    "abbr": ["title"],
    "*": ["class"],
}
ALLOWED_PROTOCOLS = frozenset({"http", "https", "mailto"})


def sanitize_help_html(value: str | None) -> str:
    if not value:
        return ""
    cleaned = bleach.clean(
        value,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
    return cleaned
