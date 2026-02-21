from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from urllib.parse import quote_plus, urlparse

import httpx

from ..config import settings
from ..engines.common import clamp, stable_score

POSITIVE_TERMS = {"growth", "beat", "record", "strong", "profit", "upgrade", "expands"}
NEGATIVE_TERMS = {"fraud", "loss", "downgrade", "fall", "decline", "investigation", "debt"}

SOURCE_WEIGHT = {
    "moneycontrol.com": 0.85,
    "livemint.com": 0.82,
    "economictimes.indiatimes.com": 0.80,
    "business-standard.com": 0.78,
}


def fallback_news_features(symbol: str) -> dict[str, float | bool]:
    return {
        "news_score": stable_score(symbol, 40, 85, "news"),
        "confidence": stable_score(symbol, 45, 90, "news-confidence"),
        "spike_detected": stable_score(symbol, 0, 1, "news-spike") > 0.8,
        "low_confidence": False,
        "stale": True,
    }


def _source_domain(url: str) -> str:
    parsed = urlparse(url.strip())
    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host or "unknown"


def _source_weight_for(domain: str, source_name: str, source_weights: dict[str, float]) -> float:
    normalized_source = source_name.strip().lower()
    if domain in source_weights:
        return float(source_weights[domain])
    if normalized_source in source_weights:
        return float(source_weights[normalized_source])
    return float(source_weights.get("unknown", 0.5))


def _score_text(title: str, description: str) -> float:
    text = f"{title} {description}".lower()
    positive = sum(1 for term in POSITIVE_TERMS if term in text)
    negative = sum(1 for term in NEGATIVE_TERMS if term in text)
    return float(clamp((positive - negative) / 3, -1, 1))


def _article_confidence(credibility_weight: float, published_at: datetime, now: datetime) -> float:
    age_hours = max((now - published_at).total_seconds() / 3600, 0.0)
    recency = max(0.1, 1.0 - min(age_hours / 72, 0.9))
    return float(round(clamp((credibility_weight * 70) + (recency * 30), 20, 95), 2))


def _article_hash(title: str, description: str, source_domain: str) -> str:
    text = " ".join(f"{title} {description}".lower().split())
    return sha256(f"{text}::{source_domain}".encode("utf-8")).hexdigest()


def _summarize_articles(articles: list[dict[str, str | float]]) -> dict[str, float | bool]:
    now = datetime.now(timezone.utc)
    weighted_signal = 0.0
    total_weight = 0.0
    content_hashes: list[str] = []
    sources: set[str] = set()
    article_confidences: list[float] = []
    last_hour_count = 0

    for article in articles:
        sentiment = float(article["sentiment"])
        credibility = float(article["credibility_weight"])
        article_confidences.append(float(article["confidence"]))
        content_hashes.append(str(article["content_hash"]))
        sources.add(str(article["source"]))

        published_raw = str(article["published_at"])
        try:
            published_at = datetime.fromisoformat(published_raw)
            if published_at.tzinfo is None:
                published_at = published_at.replace(tzinfo=timezone.utc)
            else:
                published_at = published_at.astimezone(timezone.utc)
        except ValueError:
            published_at = now

        age_hours = max((now - published_at).total_seconds() / 3600, 0.0)
        recency = max(0.1, 1.0 - min(age_hours / 72, 0.9))
        combined_weight = credibility * recency
        weighted_signal += sentiment * combined_weight
        total_weight += combined_weight

        if age_hours <= 1:
            last_hour_count += 1

    normalized_signal = weighted_signal / total_weight if total_weight else 0.0
    duplicates = sum(count - 1 for count in Counter(content_hashes).values() if count > 1)
    duplication_factor = max(0.5, 1.0 - duplicates / max(len(content_hashes), 1))

    raw_news_score = (60 + normalized_signal * 20) * duplication_factor
    news_score = float(clamp(raw_news_score, 0, 100))

    coverage_confidence = min(1.0, len(articles) / 25)
    diversity_confidence = min(1.0, len(sources) / 8)
    avg_article_confidence = (
        sum(article_confidences) / len(article_confidences) / 100 if article_confidences else 0
    )
    confidence = float(
        clamp(
            (0.35 * coverage_confidence + 0.25 * diversity_confidence + 0.40 * avg_article_confidence)
            * 100,
            0,
            100,
        )
    )

    return {
        "news_score": round(news_score, 2),
        "confidence": round(confidence, 2),
        "spike_detected": last_hour_count >= 8,
        "low_confidence": confidence < 45,
        "stale": False,
    }


async def fetch_news_articles(
    symbol: str,
    source_weights: dict[str, float] | None = None,
) -> list[dict[str, str | float]]:
    if not settings.news_api_key:
        return []

    merged_source_weights = {**SOURCE_WEIGHT, **(source_weights or {})}
    query = quote_plus(f"{symbol.replace('.NS', '').replace('.BO', '')} stock India")
    from_date = (datetime.now(timezone.utc) - timedelta(days=3)).strftime("%Y-%m-%d")
    url = (
        "https://newsapi.org/v2/everything?"
        f"q={query}&from={from_date}&sortBy=publishedAt&pageSize=30&apiKey={settings.news_api_key}"
    )

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(url)
            response.raise_for_status()
        payload = response.json()
        raw_articles = payload.get("articles")
        if not isinstance(raw_articles, list) or not raw_articles:
            return []

        now = datetime.now(timezone.utc)
        articles: list[dict[str, str | float]] = []

        for article in raw_articles:
            if not isinstance(article, dict):
                continue

            title = str(article.get("title") or "").strip()
            description = str(article.get("description") or "").strip()
            url_value = str(article.get("url") or "").strip()
            if not title or not url_value:
                continue

            source_object = article.get("source")
            source_name = (
                str(source_object.get("name") or "unknown")
                if isinstance(source_object, dict)
                else "unknown"
            )
            source_domain = _source_domain(url_value)

            published_raw = str(article.get("publishedAt") or "")
            try:
                published_at = datetime.fromisoformat(published_raw.replace("Z", "+00:00"))
                if published_at.tzinfo is None:
                    published_at = published_at.replace(tzinfo=timezone.utc)
                else:
                    published_at = published_at.astimezone(timezone.utc)
            except ValueError:
                published_at = now

            credibility_weight = clamp(
                _source_weight_for(source_domain, source_name, merged_source_weights),
                0.1,
                1.0,
            )
            sentiment = round(_score_text(title, description), 2)

            articles.append(
                {
                    "source": source_domain,
                    "title": title,
                    "url": url_value,
                    "published_at": published_at.isoformat(),
                    "sentiment": sentiment,
                    "confidence": _article_confidence(credibility_weight, published_at, now),
                    "credibility_weight": round(float(credibility_weight), 2),
                    "content_hash": _article_hash(title, description, source_domain),
                }
            )

        return articles
    except Exception:
        return []


async def fetch_news_features(symbol: str) -> dict[str, float | bool]:
    if not settings.news_api_key:
        return fallback_news_features(symbol)

    articles = await fetch_news_articles(symbol)
    if not articles:
        return fallback_news_features(symbol)
    return _summarize_articles(articles)
