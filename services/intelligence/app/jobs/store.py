from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx

from ..config import settings


class SupabaseRest:
    def __init__(self) -> None:
        self.base = settings.supabase_url
        self.key = settings.supabase_service_role_key

    @property
    def enabled(self) -> bool:
        return bool(self.base and self.key)

    async def upsert(self, table: str, rows: list[dict], on_conflict: str | None = None) -> None:
        if not self.enabled or not rows:
            return

        url = f"{self.base}/rest/v1/{table}"
        headers = {
            "apikey": str(self.key),
            "Authorization": f"Bearer {self.key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        }
        params = {"on_conflict": on_conflict} if on_conflict else None

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=headers, params=params, json=rows)
            response.raise_for_status()

    async def get_source_credibility(self) -> dict[str, float]:
        if not self.enabled:
            return {}

        url = f"{self.base}/rest/v1/source_credibility"
        headers = {
            "apikey": str(self.key),
            "Authorization": f"Bearer {self.key}",
        }
        params = {"select": "source,reputation_weight"}

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            rows = response.json()

        if not isinstance(rows, list):
            return {}

        weights: dict[str, float] = {}
        for row in rows:
            if not isinstance(row, dict):
                continue
            source = str(row.get("source") or "").strip().lower()
            if not source:
                continue
            try:
                weights[source] = float(row.get("reputation_weight"))
            except (TypeError, ValueError):
                continue

        return weights

    async def get_recent_news_hashes(self, symbol: str, lookback_hours: int = 96) -> set[str]:
        if not self.enabled:
            return set()

        since = (datetime.now(timezone.utc) - timedelta(hours=lookback_hours)).isoformat()
        url = f"{self.base}/rest/v1/news_items"
        headers = {
            "apikey": str(self.key),
            "Authorization": f"Bearer {self.key}",
        }
        params = {
            "select": "content_hash",
            "symbol": f"eq.{symbol}",
            "published_at": f"gte.{since}",
            "content_hash": "not.is.null",
            "order": "published_at.desc",
            "limit": "500",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            rows = response.json()

        if not isinstance(rows, list):
            return set()

        hashes: set[str] = set()
        for row in rows:
            if not isinstance(row, dict):
                continue
            value = row.get("content_hash")
            if value:
                hashes.add(str(value))
        return hashes

    async def get_latest_trust_score(self, symbol: str) -> float | None:
        if not self.enabled:
            return None

        url = f"{self.base}/rest/v1/trust_scores"
        headers = {
            "apikey": str(self.key),
            "Authorization": f"Bearer {self.key}",
        }
        params = {
            "select": "trust_score",
            "symbol": f"eq.{symbol}",
            "order": "as_of_date.desc",
            "limit": "1",
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            rows = response.json()

        if not rows:
            return None

        trust_score = rows[0].get("trust_score")
        if trust_score is None:
            return None

        try:
            return float(trust_score)
        except (TypeError, ValueError):
            return None

    async def get_latest_trust_scores(self, symbols: list[str]) -> dict[str, float]:
        result: dict[str, float] = {}
        for symbol in symbols:
            score = await self.get_latest_trust_score(symbol)
            if score is not None:
                result[symbol] = score
        return result


supabase_rest = SupabaseRest()
