from __future__ import annotations

import hashlib


def stable_unit(symbol: str, salt: str = "") -> float:
    digest = hashlib.sha256(f"{symbol}:{salt}".encode("utf-8")).hexdigest()
    value = int(digest[:8], 16)
    return (value % 10000) / 10000.0


def stable_score(symbol: str, floor: float, ceiling: float, salt: str = "") -> float:
    unit = stable_unit(symbol, salt)
    return round(floor + (ceiling - floor) * unit, 2)


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(value, upper))
