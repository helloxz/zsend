# ZSend

[中文文档](./README.zh-CN.md)

ZSend is an SMTP-to-HTTP mail sending service built on Cloudflare Workers. It exposes an HTTP API, matches the sender address to the configured SMTP account, sends mail through SMTP, and records delivery logs in Cloudflare D1.

## Features

- Built on Cloudflare Workers and `Hono.js`
- Send email over HTTP with multiple SMTP accounts
- Match SMTP accounts by the request `from` address
- Support `text`, `html`, and `markdown` content types
- Retry once automatically when SMTP sending fails
- Store mail delivery logs in Cloudflare D1
- Protect the send endpoint with Bearer token authentication
- View delivery logs and manage SMTP accounts via Web UI

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

- `from`: required, the server first tries to match the `fromEmail` of an SMTP account configured in the Web UI; if no match is found, it falls back to that account's `username`
- `to`: required, recipient email address, can be a string or array, e.g.: `["user1@example.com", "user2@example.com"]`
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

### SMTP Account Configuration

The latest version no longer requires the `SMTP_CONFIGS` environment variable. SMTP accounts are added through the Web UI and stored in Cloudflare D1.

After deployment, visit the Worker homepage, log in with your `TOKEN`, and add SMTP accounts on the **SMTP Accounts** page.

Field reference:

- `host`: SMTP server hostname
- `port`: SMTP server port
- `username`: SMTP login account
- `password`: SMTP password
- `fromEmail`: optional actual sender email address; falls back to `username` when missing or empty
- `protocol`: select `SSL` for implicit TLS, otherwise it is treated as STARTTLS
- `senderName`: default display name for that SMTP account
- `enabled`: whether this account is enabled; disabled accounts are not used for sending
- `remark`: optional note

## Deploy to Cloudflare Workers

### Prerequisites

1. Install [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
2. Login to Cloudflare

```bash
wrangler login
```

### 1. Fork and Clone

Fork this project to your GitHub account, then clone it locally:

```bash
git clone https://github.com/your-username/zsend.git
cd zsend
```

### 2. Create D1 Database

```bash
wrangler d1 create zsend
```

After creation, you'll see output like:

```
✅ Successfully created DB 'zsend'
[[d1_databases]]
binding = "DB"
database_name = "zsend"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the `database_id` and fill it into the `wrangler.jsonc` file.

### 3. Set Environment Variables

```bash
wrangler secret put TOKEN
# Enter any string as your Bearer Token
```

### 4. Deploy

```bash
bun install
wrangler deploy
```

After deployment, the Worker URL will be displayed, e.g.: `https://zsend.your-subdomain.workers.dev`

### 5. Add SMTP Accounts

Visit `https://zsend.your-subdomain.workers.dev`, log in with the `TOKEN` you set above, then open the **SMTP Accounts** page to add SMTP accounts.

After accounts are added, the send API matches enabled SMTP accounts by the request body's `from` field.

### 6. Test

```bash
curl -X POST "https://zsend.your-subdomain.workers.dev/api/v1/send" \
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

### 7. View Logs

Visit `https://zsend.your-subdomain.workers.dev` to view delivery logs via the Web UI.
