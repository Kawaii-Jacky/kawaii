"""Outbound operational alerts for API reliability and backup jobs."""
from __future__ import annotations

import argparse
import os
import smtplib
from email.message import EmailMessage

from app.db import connection


def email_recipients() -> list[str]:
    configured = os.getenv("ALERT_EMAIL_TO", "").strip() or os.getenv("ADMIN_EMAIL", "").strip()
    recipients = [item.strip().lower() for item in configured.split(",") if item.strip()]
    if not recipients:
        try:
            with connection() as db:
                rows = db.execute(
                    "select email from users where role='admin' and disabled=0 and email is not null"
                ).fetchall()
            recipients = [str(row["email"]).strip().lower() for row in rows if row["email"]]
        except Exception:
            recipients = []
    return list(dict.fromkeys(recipients))


def email_ready() -> bool:
    return bool(
        os.getenv("SMTP_HOST")
        and (os.getenv("SMTP_FROM") or os.getenv("SMTP_USERNAME"))
        and email_recipients()
    )


def send_email_alert(subject: str, body: str) -> int:
    recipients = email_recipients()
    host = os.getenv("SMTP_HOST", "")
    sender = os.getenv("SMTP_FROM", os.getenv("SMTP_USERNAME", ""))
    if not host or not sender or not recipients:
        return 0
    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME", "")
    password = os.getenv("SMTP_PASSWORD", "")
    message = EmailMessage()
    message["Subject"] = subject[:160]
    message["From"] = sender
    message["To"] = ", ".join(recipients)
    message.set_content(body)
    smtp_class = smtplib.SMTP_SSL if os.getenv("SMTP_SSL", "0") == "1" else smtplib.SMTP
    with smtp_class(host, port, timeout=15) as smtp:
        if smtp_class is smtplib.SMTP and os.getenv("SMTP_STARTTLS", "1") == "1":
            smtp.starttls()
        if username:
            smtp.login(username, password)
        smtp.send_message(message)
    return len(recipients)


def notify_alert(kind: str, subject: str, body: str) -> bool:
    """Send an alert without exposing addresses or credentials to logs."""
    prefix = os.getenv("ALERT_SUBJECT_PREFIX", "[ASTRA]").strip()
    delivered = send_email_alert(f"{prefix} {subject}".strip(), f"事件：{kind}\n\n{body}\n")
    return delivered > 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Send an ASTRA operational alert")
    parser.add_argument("kind")
    parser.add_argument("subject")
    parser.add_argument("body")
    args = parser.parse_args()
    sent = notify_alert(args.kind, args.subject, args.body)
    print("alert-sent" if sent else "alert-recipient-not-configured")
    return 0 if sent else 4


if __name__ == "__main__":
    raise SystemExit(main())
