import base64
import hashlib
import hmac
import importlib
import json
import os
import sys
import unittest
import urllib.parse
from unittest.mock import patch


TEST_ENV = {
    "SMS_WEBHOOK_TOKEN": "test-webhook-token",
    "SMS_GATEWAY_MODE": "aliyun",
    "ALIYUN_SMS_ACCESS_KEY_ID": "test-key-id",
    "ALIYUN_SMS_ACCESS_KEY_SECRET": "test-key-secret",
    "ALIYUN_SMS_SIGN_NAME": "ASTRA test",
    "ALIYUN_SMS_TEMPLATE_CODE": "SMS_TEST_SHARED",
    "ALIYUN_SMS_TEMPLATE_CODE_REGISTER": "",
    "ALIYUN_SMS_TEMPLATE_CODE_RECOVER": "",
    "ALIYUN_SMS_REGION_ID": "cn-hangzhou",
    "ALIYUN_PNVS_ACCESS_KEY_ID": "test-pnvs-key-id",
    "ALIYUN_PNVS_ACCESS_KEY_SECRET": "test-pnvs-key-secret",
    "ALIYUN_PNVS_SIGN_NAME": "Gifted sign",
    "ALIYUN_PNVS_TEMPLATE_CODE": "100001",
    "ALIYUN_PNVS_SCHEME_NAME": "ASTRA",
    "ALIYUN_PNVS_VALID_MINUTES": "10",
    "ALIYUN_PNVS_INTERVAL_SECONDS": "60",
}


class FakeResponse:
    def __init__(self, body=b'{"Code":"OK","BizId":"test-biz-id"}'):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def read(self):
        return self.body


class AliyunSmsGatewayTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.env_patch = patch.dict(os.environ, TEST_ENV, clear=False)
        cls.env_patch.start()
        sys.modules.pop("app.sms_gateway", None)
        cls.gateway = importlib.import_module("app.sms_gateway")

    @classmethod
    def tearDownClass(cls):
        cls.env_patch.stop()

    def test_shared_template_falls_back_when_purpose_variables_are_blank(self):
        self.assertTrue(self.gateway.aliyun_configured())
        self.assertEqual(self.gateway.ALIYUN_TEMPLATE_REGISTER, "SMS_TEST_SHARED")
        self.assertEqual(self.gateway.ALIYUN_TEMPLATE_RECOVER, "SMS_TEST_SHARED")

    def test_send_request_is_signed_and_normalizes_mainland_phone(self):
        captured = {}

        def fake_urlopen(request, timeout):
            captured["request"] = request
            captured["timeout"] = timeout
            return FakeResponse()

        body = self.gateway.SmsRequest(phone="+8613812345678", code="123456", purpose="register")
        with patch.object(self.gateway.urllib.request, "urlopen", side_effect=fake_urlopen):
            reference = self.gateway.send_aliyun(body)

        self.assertEqual(reference, "test-biz-id")
        self.assertEqual(captured["timeout"], 15)
        params = dict(urllib.parse.parse_qsl(captured["request"].data.decode("utf-8")))
        signature = params.pop("Signature")
        self.assertEqual(params["PhoneNumbers"], "13812345678")
        self.assertEqual(params["TemplateCode"], "SMS_TEST_SHARED")
        self.assertEqual(json.loads(params["TemplateParam"]), {"code": "123456"})

        canonical = "&".join(
            f"{self.gateway.aliyun_percent(key)}={self.gateway.aliyun_percent(params[key])}"
            for key in sorted(params)
        )
        string_to_sign = "POST&%2F&" + self.gateway.aliyun_percent(canonical)
        expected = base64.b64encode(
            hmac.new(b"test-key-secret&", string_to_sign.encode("utf-8"), hashlib.sha1).digest()
        ).decode("ascii")
        self.assertEqual(signature, expected)

    def test_sms_authentication_request_uses_gifted_template_and_custom_code(self):
        captured = {}

        def fake_urlopen(request, timeout):
            captured["request"] = request
            captured["timeout"] = timeout
            return FakeResponse(
                b'{"Code":"OK","Success":true,"Model":{"BizId":"pnvs-test-biz-id"}}'
            )

        body = self.gateway.SmsRequest(phone="+8613812345678", code="654321", purpose="recover")
        with patch.object(self.gateway.urllib.request, "urlopen", side_effect=fake_urlopen):
            reference = self.gateway.send_aliyun_pnvs(body)

        self.assertTrue(self.gateway.aliyun_pnvs_configured())
        self.assertEqual(reference, "pnvs-test-biz-id")
        self.assertEqual(captured["request"].full_url, "https://dypnsapi.aliyuncs.com/")
        self.assertEqual(captured["timeout"], 15)
        params = dict(urllib.parse.parse_qsl(captured["request"].data.decode("utf-8")))
        signature = params.pop("Signature")
        self.assertEqual(params["Action"], "SendSmsVerifyCode")
        self.assertEqual(params["PhoneNumber"], "13812345678")
        self.assertEqual(params["CountryCode"], "86")
        self.assertEqual(params["SignName"], "Gifted sign")
        self.assertEqual(params["TemplateCode"], "100001")
        self.assertEqual(json.loads(params["TemplateParam"]), {"code": "654321", "min": "10"})
        self.assertEqual(params["CodeLength"], "6")
        self.assertEqual(params["ValidTime"], "600")
        self.assertEqual(params["Interval"], "60")
        self.assertEqual(params["ReturnVerifyCode"], "false")

        canonical = "&".join(
            f"{self.gateway.aliyun_percent(key)}={self.gateway.aliyun_percent(params[key])}"
            for key in sorted(params)
        )
        string_to_sign = "POST&%2F&" + self.gateway.aliyun_percent(canonical)
        expected = base64.b64encode(
            hmac.new(b"test-pnvs-key-secret&", string_to_sign.encode("utf-8"), hashlib.sha1).digest()
        ).decode("ascii")
        self.assertEqual(signature, expected)

    def test_gateway_phone_rate_limit(self):
        self.gateway.send_history.clear()
        original_limit = self.gateway.SMS_SEND_LIMIT
        try:
            self.gateway.SMS_SEND_LIMIT = 2
            self.gateway.enforce_send_limit("+8613812345678")
            self.gateway.enforce_send_limit("+8613812345678")
            with self.assertRaises(self.gateway.HTTPException) as raised:
                self.gateway.enforce_send_limit("+8613812345678")
            self.assertEqual(raised.exception.status_code, 429)
        finally:
            self.gateway.SMS_SEND_LIMIT = original_limit
            self.gateway.send_history.clear()


if __name__ == "__main__":
    unittest.main()
