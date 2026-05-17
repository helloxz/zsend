# ZSend

[English README](./README.md) | [开发文档](./DEV.md)

ZSend 是一个基于 Cloudflare Workers 的 SMTP 转 HTTP 发信服务。它对外提供 HTTP API 和 Bearer Token 校验，会根据请求中的发件人地址匹配对应 SMTP 配置发送邮件，并将发送日志记录到 Cloudflare D1。

## 项目特性

- 基于 Cloudflare Workers 和 `Hono.js`
- 通过 HTTP 接口发送邮件，支持多 SMTP 账号
- 按请求里的 `from` 地址精确匹配 SMTP 账号
- 支持 `text`、`html`、`markdown` 三种正文类型
- SMTP 发送失败时自动重试一次
- 将邮件发送日志写入 Cloudflare D1
- 发信接口使用 Bearer Token 鉴权

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
- `to`：必填，收件人邮箱
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

1、Fork本项目到您的Github账号
2、在【CloudFlare后台 - 构建 - 存储和数据 - D1 SQL 数据库 - 创建数据库】

![](https://img.rss.ink/2026/05/17/EyLsQgat.png)

创建完成和复制`数据库名称`和`ID`

![CleanShot 2026-05-17 at 15.33.35@2x.png](https://img.rss.ink/2026/05/17/IA8WskIZ.png)

3、修改代码中的`wrangler.jsonc`，在`d1_databases`中配置：

* `database_name`：数据库名称
* `database_id`：数据库ID

修改后记得提交代码修改。

4、回到【CloudFlare后台 - 构建 - 计算 - Workers 和 Pages - 创建应用程序】

![CleanShot 2026-05-17 at 15.38.52@2x.png](https://img.rss.ink/2026/05/17/cE740eYx.png)

5、点击【Continue with GitHub】完成授权，并选择您刚刚Fork的zsend项目完成部署。

![CleanShot 2026-05-17 at 15.40.28@2x.png](https://img.rss.ink/2026/05/17/r5hmaQIf.png)

6、在设置中添加2个环境变量

![CleanShot 2026-05-17 at 15.41.54@2x.png](https://img.rss.ink/2026/05/17/6VqXpiJJ.png)

* `TOKEN`：任意字符串，后续调用接口需要使用这个字符串做为 Bearer Token（类型为文本）
* `SMTP_CONFIGS`：SMTP 配置的 JSON 字符串（类型为JSON），示例：

```
[
    {
        "host": "mail.xiaoz.org",
        "port": 587,
        "username": "test@xiaoz.org",
        "password": "xiaoz.org",
        "protocol": "tls",
        "senderName": "ZSend A"
    },
    {
        "host": "mail.xiaoz.org",
        "port": 465,
        "username": "dev@xiaoz.org",
        "password": "xiaoz.org",
        "protocol": "ssl",
        "senderName": "ZSend B"
    }
]
```

7、最后curl调用测试

```bash
curl -X POST "https://domain.com/api/v1/send" \
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

8、后续在D1控制台可以查看发信日志

![CleanShot 2026-05-17 at 15.56.23@2x.png](https://img.rss.ink/2026/05/17/BTWWpWU6.png)
