# ZSend

[中文文档](./README.zh-CN.md) | [Development Documentation](./DEV.md)

ZSend is an SMTP-to-HTTP mail sending service built on Cloudflare Workers. It exposes an HTTP API, matches the sender address in each request to the corresponding SMTP configuration, sends mail through SMTP, and records sending logs in Cloudflare D1.

## Features

- Built on Cloudflare Workers and `Hono.js`
- Send email through an HTTP API with support for multiple SMTP accounts
- Match SMTP accounts exactly by the `from` address in the request
- Support `text`, `html`, and `markdown` body types
- Retry once automatically when SMTP sending fails
- Write email sending logs to Cloudflare D1
- Protect the send endpoint with Bearer Token authentication
- Support a Web UI for viewing sending logs and configuring SMTP accounts

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
  "content": "# Hello\nThis is an email sent by ZSend.",
  "type": "markdown",
  "sender_name": "ZSend Notifications"
}
```

Field reference:

- `from`: required, sender email address
- `to`: required, recipient email address; can be a string or an array, for example: `["user1@example.com", "user2@example.com"]`
- `title`: required, email subject
- `content`: required, email body
- `type`: optional, only `text`, `html`, and `markdown` are supported; default is `text`
- `sender_name`: optional, display name for the sender in this request; overrides the default value in the configuration

`curl` example:

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/send" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "no-reply@example.com",
    "to": "user@example.com",
    "title": "Welcome",
    "content": "# Hello\nThis is an email sent by ZSend.",
    "type": "markdown",
    "sender_name": "ZSend Notifications"
  }'
```

### `SMTP_CONFIGS` Structure

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

- `host`: SMTP server address
- `port`: SMTP port
- `username`: SMTP login account
- `password`: SMTP password
- `fromEmail`: optional, actual sender email address; falls back to `username` when not configured or empty
- `protocol`: use `ssl` for implicit TLS; otherwise STARTTLS is used
- `senderName`: default display name for this SMTP account

## Deploy to Cloudflare Workers

### Prerequisites

1. Install [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
2. Log in to your Cloudflare account

```bash
wrangler login
```

### 1. Fork and Clone the Project

Fork this project to your GitHub account, then clone it locally:

```bash
git clone https://github.com/your-username/zsend.git
cd zsend
```

### 2. Create a D1 Database

```bash
wrangler d1 create zsend
```

After creation, you will see output similar to:

```
✅ Successfully created DB 'zsend'
[[d1_databases]]
binding = "DB"
database_name = "zsend"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the generated `database_id` into the `database_id` field in `wrangler.jsonc`.

### 3. Set Environment Variables

```bash
wrangler secret put TOKEN
# Enter any string. Later API calls must use this string as the Bearer Token.
```

### 4. Deploy the Project

```bash
bun install
wrangler deploy
```

After deployment succeeds, the access URL will be displayed, for example: `https://zsend.your-subdomain.workers.dev`

### 5. Configure SMTP Accounts

After deployment, visit `https://zsend.your-subdomain.workers.dev` to view sending logs and configure SMTP accounts through the Web UI.

### 6. Test Sending

```bash
curl -X POST "https://zsend.your-subdomain.workers.dev/api/v1/send" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "no-reply@example.com",
    "to": "user@example.com",
    "title": "Welcome",
    "content": "# Hello\nThis is an email sent by ZSend.",
    "type": "markdown",
    "sender_name": "ZSend Notifications"
  }'
```
