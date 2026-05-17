# Development Guide

[README](./README.md) | [中文文档](./README.zh-CN.md)

This document covers local development, local configuration, and API debugging for ZSend.

## Requirements

- `bun`
- Cloudflare account
- Wrangler
- At least one working SMTP account
- A Cloudflare D1 database binding named `DB`

## Local Development

Install dependencies:

```bash
bun install
```

Create your local environment file:

```bash
cp .dev.vars.example .dev.vars
```

Then edit `.dev.vars` and fill in your local values for:

- `TOKEN`
- `SMTP_CONFIGS`

Start the local Worker dev server:

```bash
bun run dev
```

Notes:

- Wrangler loads local variables from `.dev.vars`
- `.dev.vars` is ignored by git and should stay local only
- `.dev.vars.example` is the template for other users and new environments
- Local dev port is fixed at `8000` in `wrangler.jsonc`
- The Worker entry is `src/index.ts`
- The project has no `test`, `lint`, or `typecheck` script configured right now

## Configuration

Current bindings used by the Worker:

| Binding | Type | Required | Description |
| --- | --- | --- | --- |
| `TOKEN` | string | Yes | Bearer token required by `POST /api/v1/send` |
| `SMTP_CONFIGS` | array or JSON string | Yes | SMTP account list used to match the `from` address |
| `DB` | D1 binding | Yes | Stores mail delivery logs in `mail_logs` |

### `SMTP_CONFIGS` shape

Each SMTP item should look like this:

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

Fields:

- `host`: SMTP server hostname
- `port`: SMTP server port
- `username`: SMTP login account
- `password`: SMTP password
- `fromEmail`: optional actual sender email address; falls back to `username` when missing or empty
- `protocol`: use `ssl` for implicit TLS, otherwise the code treats it as STARTTLS
- `senderName`: default display name for that SMTP account

The current code expects `SMTP_CONFIGS` as a JSON string. Use `.dev.vars` locally and Cloudflare secrets for production.

### Local `.dev.vars` example

```env
TOKEN=your-local-token
SMTP_CONFIGS=[{"host":"smtp.example.com","port":587,"username":"smtp-login@example.com","password":"your-smtp-password","fromEmail":"no-reply@example.com","protocol":"tls","senderName":"ZSend"}]
```

Files:

- `.dev.vars`: local-only real values
- `.dev.vars.example`: committed template without real secrets

## API Debugging

### Health Check

```http
GET /
```

Example response:

```json
{
  "code": 200,
  "msg": "Hello World!",
  "data": null
}
```

### Send Email

```http
POST /api/v1/send
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

Request body:

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

Request fields:

- `from`: required, the server first tries to match `SMTP_CONFIGS[].fromEmail`; if no match is found, it falls back to `SMTP_CONFIGS[].username`
- `to`: required, recipient email address
- `title`: required, mail subject
- `content`: required, mail body
- `type`: optional, one of `text`, `html`, `markdown`; defaults to `text`
- `sender_name`: optional, overrides the configured display name for this request

Example `curl`:

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

Accepted response example:

```json
{
  "code": 200,
  "msg": "Email request accepted",
  "data": {
    "from": "no-reply@example.com",
    "to": "user@example.com",
    "title": "Welcome"
  }
}
```

Important behavior:

- Invalid or missing Bearer token returns `401`
- Invalid JSON body returns `400`
- Missing required fields returns `400`
- Unsupported `type` returns `400`
- If no SMTP config matches `from`, the API returns `400`
- The HTTP API returns after the request is accepted; sending and log writing continue in `waitUntil`
- SMTP sending is retried once after a 10 second delay if the first attempt fails

## Useful Commands

```bash
bun run dev
bun run deploy
bun run cf-typegen
```
