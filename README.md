# ZSend

[中文文档](./README.zh-CN.md)

ZSend is an email sending gateway deployed on Cloudflare Workers. It provides a Web admin panel, multiple SMTP account management, and a unified HTTP email sending API.

## Features

- Supports deployment on Cloudflare Workers
- Visual management: manage SMTP accounts and view email sending logs through the Web UI
- Supports configuring multiple SMTP accounts
- Provides a unified HTTP API for sending emails
- Supports `text`, `html`, and `markdown` content
- Automatic retry: retries once when SMTP sending fails
- Sending logs: records a log for every email sending request
- Authenticated access: the send endpoint is protected with Bearer Token authentication

## Screenshots

![CleanShot 2026-05-29 at 08.08.59@2x.png](https://img.rss.ink/2026/05/29/gvOofSkB.png)

![](https://img.rss.ink/2026/05/29/q2D07OqN.png)

![CleanShot 2026-05-29 at 08.11.38@2x.png](https://img.rss.ink/2026/05/29/6ZYtC2Om.png)

## Deploy to Cloudflare Workers

### Prerequisites

1. Install [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
2. Log in to your Cloudflare account
3. Install [Bun](https://bun.com/)

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

## Send Email

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
