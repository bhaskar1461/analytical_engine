from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from hashlib import sha256

import httpx

from ..config import settings
from ..engines.common import clamp, stable_score

BULLISH_TERMS = {"buy", "bull", "accumulate", "upside", "breakout", "long"}
BEARISH_TERMS = {"sell", "bear", "downside", "crash", "avoid", "short"}
MEME_TERMS = {"diamond hands", "to the moon", "yolo", "ape", "meme"}


def _sentiment_score(text: str) -> float:
    low = text.lower()
    bullish = sum(1 for term in BULLISH_TERMS if term in low)
    bearish = sum(1 for term in BEARISH_TERMS if term in low)
    return float(clamp((bullish - bearish) / 2, -1, 1))


def _fallback_features(symbol: str) -> dict[str, float | bool]:
    bullish_pct = stable_score(symbol, 30, 70, "bullish")
    bearish_pct = round(100 - bullish_pct, 2)
    hype_velocity = stable_score(symbol, 5, 95, "velocity")
    confidence = stable_score(symbol, 35, 85, "social-confidence")
    meme_risk = stable_score(symbol, 0, 1, "meme-risk") > 0.78
    return {
        "bullish_pct": bullish_pct,
        "bearish_pct": bearish_pct,
        "hype_velocity": hype_velocity,
        "confidence": confidence,
        "meme_risk_flag": meme_risk,
        "spike_detected": hype_velocity > 70,
        "stale": True,
    }


def _fallback_posts(symbol: str) -> list[dict[str, object]]:
    now = datetime.now(timezone.utc)
    posts: list[dict[str, object]] = []
    for idx in range(5):
        sentiment = round(stable_score(symbol, -1, 1, f"social-fallback-sentiment-{idx}"), 2)
        posts.append(
            {
                "source_post_id": f"fallback-{symbol}-{now.strftime('%Y%m%d%H')}-{idx}",
                "created_at": now.isoformat(),
                "karma": int(stable_score(symbol, 5, 130, f"social-fallback-karma-{idx}")),
                "account_age_days": int(stable_score(symbol, 45, 1400, f"social-fallback-age-{idx}")),
                "sentiment": sentiment,
                "is_bot": False,
                "is_spam": False,
                "post_hash": f"{symbol}-fallback-{idx}",
                "raw_json": {"ingestion": "fallback-deterministic"},
            }
        )
    return posts


def _is_probable_bot(author: str, text: str) -> bool:
    author_low = author.lower().strip()
    if not author_low:
        return True
    return author_low.endswith("bot") or "[bot]" in text or "automod" in author_low


def _content_hash(title: str, body: str) -> str:
    normalized = " ".join(f"{title} {body}".lower().split())
    return sha256(normalized.encode("utf-8")).hexdigest()


def _safe_account_age_days(
    author_created_utc: float | None,
    now_ts: float,
    fallback_key: str,
) -> int:
    if author_created_utc and author_created_utc > 0 and author_created_utc <= now_ts:
        return int(max((now_ts - author_created_utc) // 86_400, 0))
    return int(stable_score(fallback_key, 30, 1_500, "author-age"))


async def _collect_social_data(symbol: str) -> tuple[dict[str, float | bool], list[dict[str, object]]]:
    normalized = symbol.replace(".NS", "")
    url = (
        "https://www.reddit.com/r/IndianStreetBets/search.json?"
        f"q={normalized}&restrict_sr=1&sort=new&limit=100"
    )

    try:
        async with httpx.AsyncClient(
            timeout=8.0,
            headers={"User-Agent": settings.reddit_user_agent},
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

        payload = response.json()
        children: list[dict[str, object]] = payload.get("data", {}).get("children", [])  # type: ignore[assignment]

        if not children:
            raise ValueError("No social posts")

        now = datetime.now(timezone.utc)
        now_ts = now.timestamp()
        seen_hashes: set[str] = set()
        burst_buckets: Counter[int] = Counter()
        posts: list[dict[str, object]] = []
        meme_hits = 0
        duplicate_count = 0

        for idx, child in enumerate(children):
            data = child.get("data")
            if not isinstance(data, dict):
                continue

            title = str(data.get("title") or "").strip()
            body = str(data.get("selftext") or "").strip()
            merged = f"{title} {body}".lower().strip()
            if len(merged) < 12:
                continue

            source_post_id = str(data.get("id") or f"{symbol}-{idx}-{int(now_ts)}")
            author = str(data.get("author") or "")
            karma = int(data.get("score") or 0)
            created_utc = float(data.get("created_utc") or now_ts)
            author_created_utc_raw = data.get("author_created_utc")
            author_created_utc = (
                float(author_created_utc_raw)
                if isinstance(author_created_utc_raw, (int, float))
                else None
            )

            post_hash = _content_hash(title, body)
            duplicate_text = post_hash in seen_hashes
            if duplicate_text:
                duplicate_count += 1
            seen_hashes.add(post_hash)

            account_age_days = _safe_account_age_days(author_created_utc, now_ts, source_post_id)
            age_hours = max((now_ts - created_utc) / 3_600, 0.0)
            bucket_key = int(created_utc // 300)
            burst_buckets[bucket_key] += 1

            is_bot = _is_probable_bot(author, merged)
            is_spam = karma < 5 or account_age_days < 21 or duplicate_text

            sentiment = round(_sentiment_score(merged), 2)
            if any(term in merged for term in MEME_TERMS):
                meme_hits += 1

            posts.append(
                {
                    "source_post_id": source_post_id,
                    "created_at": datetime.fromtimestamp(created_utc, timezone.utc).isoformat(),
                    "karma": karma,
                    "account_age_days": account_age_days,
                    "sentiment": sentiment,
                    "is_bot": is_bot,
                    "is_spam": is_spam,
                    "post_hash": post_hash,
                    "raw_json": {
                        "author": author,
                        "title": title,
                        "permalink": str(data.get("permalink") or ""),
                        "num_comments": int(data.get("num_comments") or 0),
                        "age_hours": round(age_hours, 2),
                        "duplicate_text": duplicate_text,
                        "burst_bucket": bucket_key,
                    },
                }
            )

        if not posts:
            raise ValueError("No parseable social posts")

        bursty_buckets = {bucket for bucket, count in burst_buckets.items() if count >= 8}
        for post in posts:
            raw_json = post.get("raw_json")
            bucket = raw_json.get("burst_bucket") if isinstance(raw_json, dict) else None
            if isinstance(bucket, int) and bucket in bursty_buckets:
                post["is_spam"] = True
                if isinstance(raw_json, dict):
                    raw_json["burst_cluster"] = True

        filtered = [post for post in posts if not post["is_bot"] and not post["is_spam"]]
        if not filtered:
            raise ValueError("All social posts filtered")

        sentiments = [float(post["sentiment"]) for post in filtered]
        bullish = sum(1 for value in sentiments if value > 0.1)
        bearish = sum(1 for value in sentiments if value < -0.1)
        total = len(filtered)

        bullish_pct = (bullish / total) * 100
        bearish_pct = (bearish / total) * 100

        recent_posts = 0
        for post in filtered:
            raw = post.get("raw_json")
            age_hours = float(raw.get("age_hours") if isinstance(raw, dict) else 24)
            if age_hours <= 6:
                recent_posts += 1

        duplicate_ratio = duplicate_count / max(len(posts), 1)
        spike = recent_posts >= 15 or bool(bursty_buckets)
        polarized = abs(bullish_pct - bearish_pct) > 55
        meme_risk = meme_hits >= max(3, int(total * 0.25)) or spike or duplicate_ratio > 0.30

        hype_velocity = float(recent_posts * 8 + len(bursty_buckets) * 12 + duplicate_ratio * 30)
        confidence = min(100.0, (total / 80) * 100)
        confidence *= max(0.35, 1 - duplicate_ratio * 0.6)
        confidence -= len(bursty_buckets) * 4
        confidence = clamp(confidence, 20, 98)

        return {
            "bullish_pct": round(bullish_pct, 2),
            "bearish_pct": round(bearish_pct, 2),
            "hype_velocity": round(hype_velocity, 2),
            "confidence": round(confidence, 2),
            "meme_risk_flag": bool(meme_risk or polarized),
            "spike_detected": spike,
            "stale": False,
        }, posts
    except Exception:
        return _fallback_features(symbol), _fallback_posts(symbol)


async def fetch_social_features(symbol: str) -> dict[str, float | bool]:
    features, _posts = await _collect_social_data(symbol)
    return features


async def fetch_social_posts(symbol: str) -> list[dict[str, object]]:
    _features, posts = await _collect_social_data(symbol)
    return posts
