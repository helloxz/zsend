# ZSend

[English README](./README.md)

ZSend 是一个部署在 Cloudflare Workers 上的邮件发送网关，提供 Web 管理后台、多 SMTP 账号管理和统一的 HTTP 发信 API。

## 项目特性

- 支持 Cloudflare Workers 部署
- 可视化管理：支持WebUI管理和查看邮件发送日志
- 支持配置多个 SMTP 账号
- 提供统一HTTP API 发送邮件
- 支持 `text`、`html`、`markdown` 内容
- 自动重试：SMTP 发送失败时自动重试一次
- 发信日志：每次发信请求都会记录日志
- 鉴权访问：发信接口使用 Bearer Token 鉴权

## 部分截图

![CleanShot 2026-05-29 at 08.08.59@2x.png](https://img.rss.ink/2026/05/29/gvOofSkB.png)

![](https://img.rss.ink/2026/05/29/q2D07OqN.png)

![CleanShot 2026-05-29 at 08.11.38@2x.png](https://img.rss.ink/2026/05/29/6ZYtC2Om.png)

## 部署到 Cloudflare Workers

### 前置条件

1. 安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
2. 登录 Cloudflare 账号
3. 安装 [Bun](https://bun.com/)

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
```

### 4. 部署项目

```bash
bun install
wrangler deploy
```

部署成功后会显示访问地址，例如：`https://zsend.your-subdomain.workers.dev`

### 5. 配置 SMTP 账号

部署完成后，访问 `https://zsend.your-subdomain.workers.dev` 即可通过 Web UI 查看发信日志和配置SMTP账号。

### 6. 测试发信

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

## 发送邮件

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

- `from`：必填，发件人邮箱
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


