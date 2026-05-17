# ZSend

[中文文档](./README.zh-CN.md) | [Development Guide](./DEV.md)

ZSend is an SMTP-to-HTTP mail sending service built on Cloudflare Workers. It exposes an HTTP API, validates requests with a Bearer token, matches the sender address to the configured SMTP account, sends mail through SMTP, and records delivery logs in Cloudflare D1.

## Features

- Built on Cloudflare Workers and `Hono`
- Send email over HTTP with multiple SMTP accounts
- Match SMTP accounts by the request `from` address
- Support `text`, `html`, and `markdown` content types
- Retry once automatically when SMTP sending fails
- Store mail delivery logs in Cloudflare D1
- Protect the send endpoint with Bearer token authentication

### Send Email

```http
POST /api/v1/send
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

Request body example:

```json
{
  "from": "no-reply@example.com",
  "to": "user@example.com",
  "title": "Welcome",
  "content": "# Hello\nThis message was sent by ZSend.",
  "type": "markdown",
  "sender_name": "ZSend Notifications"
}
```

Field reference:

- `from`: required, the server first tries to match `SMTP_CONFIGS[].fromEmail`; if no match is found, it falls back to `SMTP_CONFIGS[].username`
- `to`: required, recipient email address
- `title`: required, mail subject
- `content`: required, mail body
- `type`: optional, only `text`, `html`, and `markdown` are supported, default is `text`
- `sender_name`: optional, overrides the configured display name for this request

`curl` example:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/send" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "no-reply@example.com",
    "to": "user@example.com",
    "title": "Welcome",
    "content": "# Hello\nThis message was sent by ZSend.",
    "type": "markdown",
    "sender_name": "ZSend Notifications"
  }'
```

### `SMTP_CONFIGS` shape

```json
[
  {
    "host": "smtp.example.com",
    "port": 587,
    "username": "smtp-login@example.com",
    "password": "your-password",
    "fromEmail": "no-reply@example.com",
    "protocol": "tls",
    "senderName": "ZSend"
  }
]
```

Field reference:

- `host`: SMTP server hostname
- `port`: SMTP server port
- `username`: SMTP login account
- `password`: SMTP password
- `fromEmail`: optional actual sender email address; falls back to `username` when missing or empty
- `protocol`: use `ssl` for implicit TLS, otherwise it is treated as STARTTLS
- `senderName`: default display name for that SMTP account

For production, `SMTP_CONFIGS` should be injected as a JSON string through Cloudflare Secrets.

## Deploy to Cloudflare Workers

### 1. Create a D1 database

```bash
wrangler d1 create zsend
```

After creation, copy the returned `database_name` and `database_id` into the `d1_databases` section of `wrangler.jsonc`, and keep the binding name as `DB`.

### 2. Configure Worker bindings

Do not keep real secrets in the repository. Inject them through Cloudflare.

Recommended approach:

- store `TOKEN` as a Cloudflare Secret
- store `SMTP_CONFIGS` as a JSON string Secret
- keep only non-sensitive or example values in the repository

Example commands:

```bash
wrangler secret put TOKEN
wrangler secret put SMTP_CONFIGS
```

Suggested `SMTP_CONFIGS` secret value:

```json
[
  {
    "host": "smtp.example.com",
    "port": 587,
    "username": "no-reply@example.com",
    "password": "your-password",
    "protocol": "tls",
    "senderName": "ZSend"
  }
]
```

### 3. Deploy

```bash
bun run deploy
```

After deployment, Cloudflare will return the Worker URL. You can then call:

- `GET /`
- `POST /api/v1/send`

## Security Notes

- Do not commit real SMTP passwords to the repository
- Do not keep production `TOKEN` values in `wrangler.jsonc`
- Prefer Cloudflare Secrets for sensitive values
- Prefer storing `SMTP_CONFIGS` as a JSON string in production
- The send token grants real mail-sending access and must be kept private
- Only expose SMTP accounts that you explicitly want this API to use
