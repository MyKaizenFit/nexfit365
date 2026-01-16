"""
Utilities to repair common mojibake/encoding issues.

Legacy data may contain strings where UTF-8 bytes were decoded using the wrong
encoding (Latin-1 / CP437/CP850), producing values like:
- "Tr├¡ceps" instead of "Tríceps"
- "Gl├║teos" instead of "Glúteos"
- "Ã¡" instead of "á"

This module provides a best-effort, safe transformation for API output.
"""

from __future__ import annotations

from typing import Any


_CP437_MAP = {
    "├í": "á",
    "├⌐": "é",
    "├¡": "í",
    "├│": "ó",
    "├║": "ú",
    "├▒": "ñ",
    "├╝": "ü",
}

_LATIN1_UTF8_MAP = {
    "Ã¡": "á",
    "Ã©": "é",
    "Ã­": "í",
    "Ã³": "ó",
    "Ãº": "ú",
    "Ã±": "ñ",
    "Ã¼": "ü",
    "Ã": "Á",
    "Ã‰": "É",
    "Ã": "Í",
    "Ã“": "Ó",
    "Ãš": "Ú",
    "Ã‘": "Ñ",
    "Ãœ": "Ü",
}


def fix_mojibake_text(text: Any) -> Any:
    """Return text with repaired encoding if it's a string, otherwise passthrough."""
    if text is None:
        return text
    if not isinstance(text, str):
        return text

    fixed = text

    # Specific "??" patterns we historically saw (UTF-8 replacement artifacts)
    fixed = fixed.replace("gl??teo", "glúteo").replace("Gl??teo", "Glúteo")
    fixed = fixed.replace("gl??teos", "glúteos").replace("Gl??teos", "Glúteos")
    fixed = fixed.replace("b??ceps", "bíceps").replace("B??ceps", "Bíceps")
    fixed = fixed.replace("tr??ceps", "tríceps").replace("Tr??ceps", "Tríceps")
    fixed = fixed.replace("cu??driceps", "cuádriceps").replace("Cu??driceps", "Cuádriceps")
    fixed = fixed.replace("??", "")

    # Latin-1 mis-decoded UTF-8
    for bad, good in _LATIN1_UTF8_MAP.items():
        if bad in fixed:
            fixed = fixed.replace(bad, good)

    # CP437/CP850 style mojibake
    for bad, good in _CP437_MAP.items():
        if bad in fixed:
            fixed = fixed.replace(bad, good)

    return fixed


def fix_mojibake(obj: Any) -> Any:
    """Recursively repair strings in dict/list structures."""
    if isinstance(obj, dict):
        return {k: fix_mojibake(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [fix_mojibake(v) for v in obj]
    return fix_mojibake_text(obj)

