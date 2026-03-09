"""
Lightweight email delivery service for MVP transactional emails.

If SMTP is not configured, logs the outbound email payload and returns success
so auth flows can still operate in demo/dev environments.
"""

import logging
import smtplib
from email.message import EmailMessage

from ..core.config import settings

logger = logging.getLogger(__name__)


def send_email(to_email: str, subject: str, body_text: str) -> bool:
    """Send a plain-text transactional email."""
    if not settings.SMTP_HOST or not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD:
        logger.warning(
            "SMTP not configured. Email to=%s subject=%s body=%s",
            to_email,
            subject,
            body_text,
        )
        return True

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = to_email
    msg.set_content(body_text)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
        return True
    except Exception as exc:
        logger.error("Failed sending email to %s: %s", to_email, exc)
        return False
