import secrets

from fastapi import Header, HTTPException

from .config import settings


def verify_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    if not x_internal_token or x_internal_token != settings.api_internal_token:
        raise HTTPException(status_code=401, detail="Invalid internal token")


def verify_admin_sync_key(x_admin_key: str | None = Header(default=None)) -> None:
    if not x_admin_key or not secrets.compare_digest(x_admin_key, settings.admin_sync_key):
        raise HTTPException(status_code=401, detail="Invalid admin sync key")
