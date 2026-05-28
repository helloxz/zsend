# ZSend

[English README](./README.md) | [开发文档](./DEV.md)

ZSend 是一个基于 Cloudflare Workers 的 SMTP 转 HTTP 发信服务。它对外提供 HTTP API，并根据请求中的发件人地址匹配对应 SMTP 配置发送邮件，并将发送日志记录到 Cloudflare D1。

## 项目特性

- 基于 Cloudflare Workers 和 `Hono.js`
- 通过 HTTP 接口发送邮件，支持多 SMTP 账号
- 按请求里的 `from` 地址精确匹配 SMTP 账号
- 支持 `text`、`html`、`markdown` 三种正文类型
- SMTP 发送失败时自动重试一次
- 将邮件发送日志写入 Cloudflare D1
- 发信接口使用 Bearer Token 鉴权
  - 支持WebUI查看发送日志

### 发送邮件

```http
POST /api/v1/send
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

请求体示例：

```json
{
  "from": "no-reply@example.com",
  "to": "user@example.com",
  "title": "欢迎使用",
  "content": "# Hello\n这是一封由 ZSend 发出的邮件。",
  "type": "markdown",
  "sender_name": "ZSend 通知"
}
```

字段说明：

- `from`：必填，服务端会先尝试精确匹配某个 `SMTP_CONFIGS[].fromEmail`；如果没有命中，再回退匹配 `SMTP_CONFIGS[].username`
- `to`：必填，收件人邮箱，可以是字符串或数组。比如：`["user1@example.com", "user2@example.com"]`
- `title`：必填，邮件主题
- `content`：必填，邮件正文
- `type`：可选，只支持 `text`、`html`、`markdown`，默认是 `text`
- `sender_name`：可选，本次请求的发件人显示名称，会覆盖配置里的默认值

`curl` 示例：

```bash
curl -X POST "http://127.0.0.1:8000/api/v1/send" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "no-reply@example.com",
    "to": "user@example.com",
    "title": "欢迎使用",
    "content": "# Hello\n这是一封由 ZSend 发出的邮件。",
    "type": "markdown",
    "sender_name": "ZSend 通知"
  }'
```

### `SMTP_CONFIGS` 结构

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

字段说明：

- `host`：SMTP 服务器地址
- `port`：SMTP 端口
- `username`：SMTP 登录账号
- `password`：SMTP 密码
- `fromEmail`：可选，实际发信邮箱地址；未配置或为空时回退为 `username`
- `protocol`：填 `ssl` 时按隐式 TLS 发送，否则按 STARTTLS 处理
- `senderName`：该 SMTP 账号默认显示的发件人名称

## 部署到 Cloudflare Workers

### 前置条件

1. 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
2. 登录 Cloudflare 账号

```bash
wrangler login
```

### 1. Fork 并克隆项目

Fork 本项目到您的 Github 账号，然后克隆到本地：

```bash
git clone https://github.com/your-username/zsend.git
cd zsend
```

### 2. 创建 D1 数据库

```bash
wrangler d1 create zsend
```

创建成功后会输出类似信息：

```
✅ Successfully created DB 'zsend'
[[d1_databases]]
binding = "DB"
database_name = "zsend"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

将输出的 `database_id` 填入 `wrangler.jsonc` 文件中的 `database_id` 字段。

### 3. 设置环境变量

```bash
wrangler secret put TOKEN
# 输入任意字符串，后续调用接口需要使用这个字符串做为 Bearer Token

wrangler secret put SMTP_CONFIGS
# 输入 SMTP 配置的 JSON 字符串，例如：
# [{"host":"smtp.example.com","port":587,"username":"user@example.com","password":"your-password","protocol":"tls","senderName":"ZSend"}]
```

### 4. 部署项目

```bash
bun install
wrangler deploy
```

部署成功后会显示访问地址，例如：`https://zsend.your-subdomain.workers.dev`

### 5. 测试发信

```bash
curl -X POST "https://zsend.your-subdomain.workers.dev/api/v1/send" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "no-reply@example.com",
    "to": "user@example.com",
    "title": "欢迎使用",
    "content": "# Hello\n这是一封由 ZSend 发出的邮件。",
    "type": "markdown",
    "sender_name": "ZSend 通知"
  }'
```

### 6. 查看日志

部署完成后，访问 `https://zsend.your-subdomain.workers.dev` 即可通过 Web UI 查看发信日志。
