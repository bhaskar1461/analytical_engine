from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    intelligence_port: int = 8000
    api_internal_token: str = "local-dev-token"
    admin_sync_key: str = "local-admin-sync-key"

    supabase_url: str | None = None
    supabase_service_role_key: str | None = None

    yahoo_user_agent: str = "anylical-engine/0.1"
    news_api_key: str | None = None
    reddit_client_id: str | None = None
    reddit_client_secret: str | None = None
    reddit_user_agent: str = "anylical-engine/0.1"
    nse_universe_url: str = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
    bse_universe_url: str = "https://api.bseindia.com/BseIndiaAPI/api/ListofScripData/w"
    nyse_universe_url: str = "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt"
    universe_limit_per_exchange: int = 0
    sentry_dsn: str | None = None
    posthog_key: str | None = None
    posthog_host: str = "https://app.posthog.com"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
