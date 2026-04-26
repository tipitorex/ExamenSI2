from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Plataforma Emergencias API"
    app_env: str = "dev"
    database_url: str = "postgresql+psycopg2://emergencias_user:emergencias_pass@localhost:5432/emergencias_db"
    jwt_secret_key: str = "cambiar-esta-clave-en-produccion"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60

    # ========== PARA PAGOS CON TARJETA STRIPE ==========
    stripe_secret_key: str = ""  # sk_test_xxx
    stripe_publishable_key: str = ""  # pk_test_xxx
    stripe_webhook_secret: str = ""  # whsec_xxx

    # Hugging Face API para las imagenes 
    huggingface_api_token: str = ""
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()