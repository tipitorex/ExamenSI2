import stripe
from app.core.settings import settings

# Configurar Stripe con la llave secreta
stripe.api_key = settings.stripe_secret_key

STRIPE_WEBHOOK_SECRET = settings.stripe_webhook_secret
STRIPE_PUBLISHABLE_KEY = settings.stripe_publishable_key


def get_stripe_publishable_key() -> str:
    return STRIPE_PUBLISHABLE_KEY