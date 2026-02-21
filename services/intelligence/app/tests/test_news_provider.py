from __future__ import annotations

import pytest

from app.providers import newsapi


@pytest.mark.asyncio
async def test_fetch_news_features_fallback_without_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(newsapi.settings, "news_api_key", None)
    result = await newsapi.fetch_news_features("INFY.NS")

    assert result["stale"] is True
    assert 0 <= float(result["news_score"]) <= 100
    assert 0 <= float(result["confidence"]) <= 100
