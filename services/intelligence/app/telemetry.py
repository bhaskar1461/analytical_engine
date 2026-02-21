from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse
from uuid import uuid4

import httpx

from .config import settings


def _parse_sentry_dsn() -> tuple[str, str, str] | None:
    dsn = settings.sentry_dsn
    if not dsn:
        return None
    try:
        parsed = urlparse(dsn)
        public_key = parsed.username
        project_id = parsed.path.replace("/", "")
        if not public_key or not project_id:
            return None
        host = f"{parsed.scheme}://{parsed.netloc}"
        return host, public_key, project_id
    except Exception:
        return None


async def _posthog_capture(event: str, properties: dict[str, Any]) -> None:
    if not settings.posthog_key:
        return

    host = settings.posthog_host.rstrip("/")
    payload = {
        "api_key": settings.posthog_key,
        "event": event,
        "distinct_id": str(properties.get("distinct_id") or "intelligence-service"),
        "properties": {
            **properties,
            "service": "intelligence",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }

    async with httpx.AsyncClient(timeout=3.0) as client:
        await client.post(f"{host}/capture/", json=payload)


async def _sentry_capture(error: Exception, context: dict[str, Any]) -> None:
    parsed = _parse_sentry_dsn()
    if not parsed:
        return

    host, public_key, project_id = parsed
    event_id = uuid4().hex
    envelope_header = {
        "event_id": event_id,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "sdk": {"name": "anylical-intelligence-telemetry", "version": "0.1.0"},
    }
    item_header = {"type": "event"}
    event_payload = {
        "event_id": event_id,
        "timestamp": int(datetime.now(timezone.utc).timestamp()),
        "level": "error",
        "platform": "python",
        "logger": "anylical-intelligence",
        "message": str(error),
        "extra": context,
    }

    envelope = "\n".join(
        [
            json.dumps(envelope_header),
            json.dumps(item_header),
            json.dumps(event_payload),
        ]
    )

    headers = {
        "content-type": "application/x-sentry-envelope",
        "x-sentry-auth": f"Sentry sentry_version=7, sentry_key={public_key}",
    }

    async with httpx.AsyncClient(timeout=3.0) as client:
        await client.post(f"{host}/api/{project_id}/envelope/", content=envelope, headers=headers)


async def _guard(coro: Any) -> None:
    try:
        await coro
    except Exception:
        # Telemetry is best effort and must not break user flows.
        return


def schedule_event(event: str, properties: dict[str, Any]) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    loop.create_task(_guard(_posthog_capture(event, properties)))


def schedule_exception(error: Exception, context: dict[str, Any]) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    loop.create_task(_guard(_sentry_capture(error, context)))
    loop.create_task(
        _guard(
            _posthog_capture(
                "intelligence.exception",
                {"level": "error", "message": str(error), **context},
            )
        )
    )
