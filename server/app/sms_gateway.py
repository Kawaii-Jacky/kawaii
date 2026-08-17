"""Internal SMS webhook adapter.

The default mock mode is for local learning and integration tests. Replace the
API's SMS_WEBHOOK_URL/TOKEN with a real provider adapter for actual delivery.
"""
from __future__ import annotations

import hmac
import base64
import hashlib
import json
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, Header, HTTPException, Query, status
from pydantic import BaseModel, Field

TOKEN = os.getenv("SMS_WEBHOOK_TOKEN", "")
MODE = os.getenv("SMS_GATEWAY_MODE", "mock").lower()
ALIYUN_ACCESS_KEY_ID = os.getenv("ALIYUN_SMS_ACCESS_KEY_ID", "")
ALIYUN_ACCESS_KEY_SECRET = os.getenv("ALIYUN_SMS_ACCESS_KEY_SECRET", "")
ALIYUN_SIGN_NAME = os.getenv("ALIYUN_SMS_SIGN_NAME", "")
ALIYUN_TEMPLATE_CODE = os.getenv("ALIYUN_SMS_TEMPLATE_CODE", "")
ALIYUN_TEMPLATE_REGISTER = os.getenv("ALIYUN_SMS_TEMPLATE_CODE_REGISTER", "") or ALIYUN_TEMPLATE_CODE
ALIYUN_TEMPLATE_RECOVER = os.getenv("ALIYUN_SMS_TEMPLATE_CODE_RECOVER", "") or ALIYUN_TEMPLATE_CODE
ALIYUN_REGION_ID = os.getenv("ALIYUN_SMS_REGION_ID", "cn-hangzhou")
ALIYUN_PNVS_ACCESS_KEY_ID = os.getenv("ALIYUN_PNVS_ACCESS_KEY_ID", "")
ALIYUN_PNVS_ACCESS_KEY_SECRET = os.getenv("ALIYUN_PNVS_ACCESS_KEY_SECRET", "")
ALIYUN_PNVS_SIGN_NAME = os.getenv("ALIYUN_PNVS_SIGN_NAME", "")
ALIYUN_PNVS_TEMPLATE_CODE = os.getenv("ALIYUN_PNVS_TEMPLATE_CODE", "")
ALIYUN_PNVS_SCHEME_NAME = os.getenv("ALIYUN_PNVS_SCHEME_NAME", "ASTRA")[:20]
ALIYUN_PNVS_VALID_MINUTES = max(1, min(30, int(os.getenv("ALIYUN_PNVS_VALID_MINUTES", "10"))))
ALIYUN_PNVS_INTERVAL_SECONDS = max(60, int(os.getenv("ALIYUN_PNVS_INTERVAL_SECONDS", "60")))
SMS_SEND_LIMIT = max(2, int(os.getenv("SMS_SEND_LIMIT", "5")))
SMS_SEND_WINDOW_SECONDS = max(300, int(os.getenv("SMS_SEND_WINDOW_SECONDS", "3600")))
PHONE_RE = re.compile(r"^\+?[1-9]\d{7,14}$")
MAINLAND_PHONE_RE = re.compile(r"^1[3-9]\d{9}$")
messages: deque[dict[str, str]] = deque(maxlen=100)
send_history: dict[str, deque[float]] = {}
lock = threading.Lock()
app = FastAPI(title="ASTRA SMS Gateway", version="1.0.0", docs_url=None, redoc_url=None)


class SmsRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=16)
    code: str = Field(pattern=r"^\d{6}$")
    purpose: Literal["register", "recover"]
    product: str = Field(default="ASTRA", max_length=32)


def authorize(authorization: str | None) -> None:
    expected = f"Bearer {TOKEN}"
    if not TOKEN or not authorization or not hmac.compare_digest(authorization, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid SMS gateway token")


def enforce_send_limit(phone: str) -> None:
    """Second-line provider cost protection, independent of the public API."""
    now = time.monotonic()
    with lock:
        history = send_history.setdefault(phone, deque())
        while history and now - history[0] >= SMS_SEND_WINDOW_SECONDS:
            history.popleft()
        if len(history) >= SMS_SEND_LIMIT:
            retry_after = max(1, int(SMS_SEND_WINDOW_SECONDS - (now - history[0])))
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "SMS send rate limit exceeded",
                headers={"Retry-After": str(retry_after)},
            )
        history.append(now)


def aliyun_configured() -> bool:
    return bool(
        ALIYUN_ACCESS_KEY_ID
        and ALIYUN_ACCESS_KEY_SECRET
        and ALIYUN_SIGN_NAME
        and ALIYUN_TEMPLATE_REGISTER
        and ALIYUN_TEMPLATE_RECOVER
    )


def aliyun_pnvs_configured() -> bool:
    return bool(
        ALIYUN_PNVS_ACCESS_KEY_ID
        and ALIYUN_PNVS_ACCESS_KEY_SECRET
        and ALIYUN_PNVS_SIGN_NAME
        and ALIYUN_PNVS_TEMPLATE_CODE
    )


def aliyun_percent(value: str) -> str:
    return urllib.parse.quote(value, safe="~")


def aliyun_rpc(endpoint: str, parameters: dict[str, str | int], access_key_id: str, access_key_secret: str) -> dict:
    parameters = {
        "AccessKeyId": access_key_id,
        "Format": "JSON",
        "SignatureMethod": "HMAC-SHA1",
        "SignatureNonce": str(uuid.uuid4()),
        "SignatureVersion": "1.0",
        "Timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        **parameters,
    }
    canonical = "&".join(
        f"{aliyun_percent(key)}={aliyun_percent(str(parameters[key]))}" for key in sorted(parameters)
    )
    string_to_sign = "POST&%2F&" + aliyun_percent(canonical)
    digest = hmac.new(
        (access_key_secret + "&").encode("utf-8"),
        string_to_sign.encode("utf-8"),
        hashlib.sha1,
    ).digest()
    parameters["Signature"] = base64.b64encode(digest).decode("ascii")
    request = urllib.request.Request(
        endpoint,
        data=urllib.parse.urlencode(parameters).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ASTRA-SMS-Gateway/1.2"},
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(f"Aliyun API HTTP {exc.code}: {detail}") from exc


def send_aliyun(body: SmsRequest) -> str:
    if not aliyun_configured():
        raise RuntimeError("Aliyun SMS credentials, sign name, or template code are incomplete")
    phone = body.phone[3:] if body.phone.startswith("+86") else body.phone
    template = ALIYUN_TEMPLATE_REGISTER if body.purpose == "register" else ALIYUN_TEMPLATE_RECOVER
    result = aliyun_rpc("https://dysmsapi.aliyuncs.com/", {
        "Action": "SendSms",
        "PhoneNumbers": phone,
        "RegionId": ALIYUN_REGION_ID,
        "SignName": ALIYUN_SIGN_NAME,
        "TemplateCode": template,
        "TemplateParam": json.dumps({"code": body.code}, separators=(",", ":"), ensure_ascii=False),
        "Version": "2017-05-25",
    }, ALIYUN_ACCESS_KEY_ID, ALIYUN_ACCESS_KEY_SECRET)
    if result.get("Code") != "OK":
        raise RuntimeError(f"Aliyun SMS {result.get('Code', 'Unknown')}: {result.get('Message', 'delivery failed')}")
    return str(result.get("BizId") or result.get("RequestId") or "accepted")


def send_aliyun_pnvs(body: SmsRequest) -> str:
    """Send a caller-generated code through Aliyun SMS Authentication.

    ASTRA remains the source of truth for code lifetime and verification. PNVS
    is used only as the delivery channel, so ReturnVerifyCode stays disabled.
    """
    if not aliyun_pnvs_configured():
        raise RuntimeError("Aliyun SMS Authentication credentials, gifted sign, or gifted template are incomplete")
    phone = body.phone[3:] if body.phone.startswith("+86") else body.phone
    if not MAINLAND_PHONE_RE.fullmatch(phone):
        raise RuntimeError("Aliyun SMS Authentication currently supports mainland China mobile numbers only")
    result = aliyun_rpc("https://dypnsapi.aliyuncs.com/", {
        "Action": "SendSmsVerifyCode",
        "Version": "2017-05-25",
        "CountryCode": "86",
        "PhoneNumber": phone,
        "SignName": ALIYUN_PNVS_SIGN_NAME,
        "TemplateCode": ALIYUN_PNVS_TEMPLATE_CODE,
        "TemplateParam": json.dumps(
            {"code": body.code, "min": str(ALIYUN_PNVS_VALID_MINUTES)},
            separators=(",", ":"),
            ensure_ascii=False,
        ),
        "SchemeName": ALIYUN_PNVS_SCHEME_NAME,
        "CodeLength": 6,
        "ValidTime": ALIYUN_PNVS_VALID_MINUTES * 60,
        "DuplicatePolicy": 1,
        "Interval": ALIYUN_PNVS_INTERVAL_SECONDS,
        "ReturnVerifyCode": "false",
        "AutoRetry": 1,
    }, ALIYUN_PNVS_ACCESS_KEY_ID, ALIYUN_PNVS_ACCESS_KEY_SECRET)
    if result.get("Code") != "OK" or result.get("Success") is False:
        raise RuntimeError(
            f"Aliyun SMS Authentication {result.get('Code', 'Unknown')}: "
            f"{result.get('Message', 'delivery failed')}"
        )
    model = result.get("Model") or {}
    return str(model.get("BizId") or model.get("RequestId") or result.get("RequestId") or "accepted")


@app.get("/health")
def health() -> dict[str, str | bool]:
    provider_ready = (
        MODE == "mock"
        or (MODE == "aliyun" and aliyun_configured())
        or (MODE == "aliyun_pnvs" and aliyun_pnvs_configured())
    )
    return {"ok": bool(TOKEN) and provider_ready, "mode": MODE, "configured": bool(TOKEN), "providerReady": provider_ready}


@app.post("/send", status_code=202)
def send_sms(body: SmsRequest, authorization: str | None = Header(default=None)) -> dict[str, str | bool]:
    authorize(authorization)
    if not PHONE_RE.fullmatch(body.phone):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid phone")
    enforce_send_limit(body.phone)
    if MODE == "mock":
        with lock:
            messages.append({
                "phone": body.phone,
                "code": body.code,
                "purpose": body.purpose,
                "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            })
        return {"ok": True, "provider": "mock"}
    if MODE == "aliyun":
        try:
            reference = send_aliyun(body)
        except RuntimeError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
        return {"ok": True, "provider": "aliyun", "reference": reference}
    if MODE == "aliyun_pnvs":
        phone = body.phone[3:] if body.phone.startswith("+86") else body.phone
        if not MAINLAND_PHONE_RE.fullmatch(phone):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Mainland China mobile number required")
        try:
            reference = send_aliyun_pnvs(body)
        except RuntimeError as exc:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from exc
        return {"ok": True, "provider": "aliyun_pnvs", "reference": reference}
    raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Unsupported SMS provider mode")


@app.get("/debug/latest")
def latest_mock(
    phone: str = Query(..., min_length=8, max_length=16),
    authorization: str | None = Header(default=None),
) -> dict[str, str]:
    authorize(authorization)
    if MODE != "mock":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mock inbox is disabled")
    with lock:
        for message in reversed(messages):
            if message["phone"] == phone:
                return message
    raise HTTPException(status.HTTP_404_NOT_FOUND, "No mock message")
