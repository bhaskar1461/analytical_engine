from __future__ import annotations

from app.jobs.news_ingest import _mark_duplicate_hashes


def _row(content_hash: str) -> dict[str, str | float | bool]:
    return {
        "symbol": "RELIANCE.NS",
        "source": "moneycontrol.com",
        "title": "Reliance update",
        "url": f"https://example.com/{content_hash}",
        "published_at": "2026-02-20T00:00:00+00:00",
        "sentiment": 0.2,
        "confidence": 70.0,
        "credibility_weight": 0.85,
        "is_duplicate": False,
        "content_hash": content_hash,
    }


def test_duplicate_hash_detection_uses_existing_and_batch_state() -> None:
    rows = [_row("hash-a"), _row("hash-b"), _row("hash-a"), _row("hash-c")]
    result = _mark_duplicate_hashes(rows, {"hash-b"})

    assert result[0]["is_duplicate"] is False
    assert result[1]["is_duplicate"] is True
    assert result[2]["is_duplicate"] is True
    assert result[3]["is_duplicate"] is False
