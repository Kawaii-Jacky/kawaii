# SMS verification gateway

ASTRA authentication sends a server-internal JSON webhook containing `phone`,
`code`, `purpose`, and `product`. The webhook requires `SMS_WEBHOOK_TOKEN` and
is not published through Nginx or Cloudflare. The browser never receives the
six-digit code in production mode.

## Local integration mode

Keep `SMS_GATEWAY_MODE=mock` while configuring or testing. The internal mock
inbox is only reachable from the server and lets the registration/recovery
flow be tested without sending or charging for an SMS.

## Aliyun SMS Authentication (recommended for individual developers)

ASTRA uses the Phone Number Verification Service endpoint
`SendSmsVerifyCode`. This product supplies the sign and template, so it does
not require an enterprise SMS qualification, a custom sign application, or a
custom template application. Enable SMS Authentication in the Phone Number
Verification Service console, then select one gifted sign and one matching
gifted template.

The API currently supports mainland China mobile numbers only. ASTRA generates
and validates the six-digit code itself; Aliyun is the delivery channel. This
keeps email and SMS verification under the same expiry, attempt-limit, and
account-security rules.

Populate these server-only values in `.env`:

```env
SMS_WEBHOOK_URL=http://127.0.0.1:8090/send
SMS_WEBHOOK_TOKEN=<random internal bearer token>
SMS_GATEWAY_MODE=aliyun_pnvs
ALIYUN_PNVS_ACCESS_KEY_ID=<RAM user AccessKey ID>
ALIYUN_PNVS_ACCESS_KEY_SECRET=<RAM user AccessKey secret>
ALIYUN_PNVS_SIGN_NAME=<gifted sign shown in the PNVS console>
ALIYUN_PNVS_TEMPLATE_CODE=<matching gifted template code>
ALIYUN_PNVS_SCHEME_NAME=ASTRA
ALIYUN_PNVS_VALID_MINUTES=10
ALIYUN_PNVS_INTERVAL_SECONDS=60
```

The gifted template must expose `code` and `min` variables. Do not enable the
mode until the service, sign, template, account balance, and RAM permission are
ready.

## Legacy Aliyun SMS adapter

The older `aliyun` mode remains available for enterprise deployments. Create a RAM user with only the SMS send permission, approve an SMS signature,
and approve one or two verification-code templates. Then populate the following
server-only values in `.env`:

```env
SMS_WEBHOOK_URL=http://127.0.0.1:8090/send
SMS_WEBHOOK_TOKEN=<random internal bearer token>
SMS_GATEWAY_MODE=aliyun
ALIYUN_SMS_ACCESS_KEY_ID=<RAM user AccessKey ID>
ALIYUN_SMS_ACCESS_KEY_SECRET=<RAM user AccessKey secret>
ALIYUN_SMS_SIGN_NAME=<approved signature text>
ALIYUN_SMS_TEMPLATE_CODE=<shared template code, optional>
ALIYUN_SMS_TEMPLATE_CODE_REGISTER=<registration template code>
ALIYUN_SMS_TEMPLATE_CODE_RECOVER=<password recovery template code>
ALIYUN_SMS_REGION_ID=cn-hangzhou
```

If both purposes use the same approved template, set only
`ALIYUN_SMS_TEMPLATE_CODE`. Otherwise leave it empty and set both purpose
template codes. The template must accept a parameter named `code`.

After changing the values, rebuild only the gateway and verify health before a
single test send:

```powershell
wsl -e bash -lc "cd '/mnt/d/h2o/remote astro/server' && docker compose -f docker-compose.yml -f docker-compose.wsl.yml up -d --build sms-gateway api"
Invoke-RestMethod http://127.0.0.1:8090/health
```

Never put the Access Key, webhook token, or a verification code in frontend
files, Git, logs, screenshots, or chat output. Real delivery can incur charges.
