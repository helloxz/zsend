# ZSend

[中文文档](./README.zh-CN.md)

ZSend is an SMTP-to-HTTP mail sending service built on Cloudflare Workers. It exposes an HTTP API, validates requests with a Bearer token, selects a matching SMTP account from configured bindings, sends mail through `worker-mailer`, and records delivery logs in Cloudflare D1.

## Features

- Built for Cloudflare Workers with `Hono`
- Send email over HTTP through one or more SMTP accounts
- Match the SMTP account by request `from` address
- Support `text`, `html`, and `markdown` content types
- Retry once automatically when SMTP sending fails
- Store mail delivery logs in Cloudflare D1
- Protect the send endpoint with Bearer token authentication

## Architecture

- Worker entry: `src/index.ts`
- Route registration: `src/routers.ts`
- API handlers: `src/api/`
- Reusable helpers: `src/utils/`
- Middleware: `src/middleware/`
- D1 log schema and helpers: `src/db/`

The send endpoint is mounted at `POST /api/v1/send`. The root route `GET /` returns a simple health-style JSON response.

## Response Format

All JSON responses follow the same structure:

```json
{
  "code": 200,
  "msg": "...",
  "data": {}
}
```

## Requirements

- `bun`
- A Cloudflare account
- Wrangler
- At least one SMTP account
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
    "username": "no-reply@example.com",
    "password": "your-password",
    "protocol": "tls",
    "senderName": "ZSend"
  }
]
```

Fields:

- `host`: SMTP server hostname
- `port`: SMTP server port
- `username`: SMTP login and the email address used for actual sending
- `password`: SMTP password
- `protocol`: use `ssl` for implicit TLS, otherwise the code treats it as STARTTLS
- `senderName`: default display name for that SMTP account

The current code accepts `SMTP_CONFIGS` in either of these forms:

- a JSON string from `.dev.vars` during local development
- a JSON string, which is recommended for production injection

### Local `.dev.vars` example

```env
TOKEN=your-local-token
SMTP_CONFIGS=[{"host":"smtp.example.com","port":587,"username":"no-reply@example.com","password":"your-smtp-password","protocol":"tls","senderName":"ZSend"}]
```

Files:

- `.dev.vars`: local-only real values
- `.dev.vars.example`: committed template without real secrets

## API Usage

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

- `from`: required, must exactly match one `SMTP_CONFIGS[].username`
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

## Mail Logs in D1

The Worker stores delivery records in a `mail_logs` table.

Logged fields include:

- sender and recipient email
- subject
- sender display name
- mail type
- SMTP username used for sending
- final status: `success` or `failed`
- SMTP error message when sending fails
- request IP
- cleaned text content for search and review

The Worker automatically ensures the `mail_logs` table and indexes exist before handling requests. If the `DB` binding is missing, the Worker will fail during startup handling.

Schema source:

- `src/db/index.ts`
- `src/db/schema.sql`

## Deploy to Cloudflare Workers

### 1. Install dependencies

```bash
bun install
```

### 2. Create a D1 database

```bash
wrangler d1 create zsend
```

Take the returned `database_name` and `database_id`, then update the `d1_databases` section in `wrangler.jsonc` so the binding name remains `DB`.

### 3. Configure Worker bindings

For local development, use `.dev.vars`. For production, inject real values securely instead of committing them to the repository.

Recommended production approach:

- store `TOKEN` as a Cloudflare secret
- store `SMTP_CONFIGS` as a JSON string secret
- keep only non-sensitive defaults in versioned config

Example secret commands:

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

### 4. Generate Cloudflare binding types

```bash
bun run cf-typegen
```

### 5. Deploy

```bash
bun run deploy
```

After deployment, Cloudflare will return your Worker URL. You can then call:

- `GET /`
- `POST /api/v1/send`

## Security Notes

- Do not commit real SMTP passwords to the repository
- Do not keep production `TOKEN` values in `wrangler.jsonc`
- Prefer Cloudflare secrets for sensitive values
- Prefer storing `SMTP_CONFIGS` as a JSON string in production
- Keep the send token private because it grants mail-sending access
- Restrict SMTP accounts to only the identities you intend to expose through the API

## Useful Commands

```bash
bun run dev
bun run deploy
bun run cf-typegen
```
