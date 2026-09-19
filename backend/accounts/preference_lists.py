"""Flatten nested JSON/Python-repr preference payloads into a list of labels."""
from __future__ import annotations

import ast
import json
import re

_QUOTE_CHARS = "\"'"


def _looks_like_serialized_sequence(text: str) -> bool:
    stripped = text.strip()
    return len(stripped) >= 2 and stripped[0] in "[{" and stripped[-1] in "]}"


def _parse_serialized_sequence(text: str):
    stripped = text.strip()
    for parser in (json.loads, ast.literal_eval):
        try:
            parsed = parser(stripped)
        except (TypeError, ValueError, SyntaxError, json.JSONDecodeError, MemoryError, RecursionError):
            continue
        if isinstance(parsed, (list, tuple)):
            return list(parsed)
        if isinstance(parsed, dict):
            return list(parsed.values())
        if isinstance(parsed, str):
            return parsed
    return None


def _clean_scalar(text: str) -> str:
    value = text.strip()
    for _ in range(4):
        previous = value
        if value.startswith("[") and not value.endswith("]"):
            value = value[1:].strip()
        if value.endswith("]") and not value.startswith("["):
            value = value[:-1].strip()
        if len(value) >= 2 and value[0] in _QUOTE_CHARS and value[-1] == value[0]:
            value = value[1:-1].strip()
        if value == previous:
            break
    return value


def unwrap_string_list(value) -> list[str]:
    """Return a flat list of preference labels.

    Accepts already-clean lists, comma-separated text, JSON arrays, Python
    reprs, and the nested fragments produced by repeated comma-splitting.
    """
    if value in (None, ""):
        return []

    if isinstance(value, (list, tuple)):
        out: list[str] = []
        for item in value:
            if isinstance(item, (list, tuple)):
                out.extend(unwrap_string_list(item))
            elif isinstance(item, str):
                stripped = item.strip()
                if _looks_like_serialized_sequence(stripped):
                    parsed = _parse_serialized_sequence(stripped)
                    if parsed is not None:
                        out.extend(unwrap_string_list(parsed))
                        continue
                cleaned = _clean_scalar(stripped)
                if not cleaned:
                    continue
                if _looks_like_serialized_sequence(cleaned):
                    parsed = _parse_serialized_sequence(cleaned)
                    if parsed is not None:
                        out.extend(unwrap_string_list(parsed))
                        continue
                out.append(cleaned)
            elif item is not None:
                text = str(item).strip()
                if text:
                    out.append(text)
        return out

    if isinstance(value, str):
        stripped = value.strip()
        if _looks_like_serialized_sequence(stripped):
            parsed = _parse_serialized_sequence(stripped)
            if parsed is not None:
                return unwrap_string_list(parsed)
        return [part for part in (_clean_scalar(p) for p in re.split(r"[\n,;]+", stripped)) if part]

    return unwrap_string_list([value])
