from __future__ import annotations

FORBIDDEN_PHRASES = [
    "you should buy",
    "guaranteed profit",
    "this stock will go up",
    "best stock to buy now",
    "sure shot",
]


def sanitize_text(text: str) -> str:
    output = text
    for phrase in FORBIDDEN_PHRASES:
        output = output.replace(phrase, "[removed-for-compliance]")
        output = output.replace(phrase.title(), "[removed-for-compliance]")
    return output
