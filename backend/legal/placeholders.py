import re

# Drafts may contain these. A published or active document may not.
PLACEHOLDER_RE = re.compile(r"\[[A-Z][A-Z0-9_]{2,}\]")


def contains_unpublished_placeholder(title: str, body: str) -> bool:
    return PLACEHOLDER_RE.search(f"{title or ''}\n{body or ''}") is not None
