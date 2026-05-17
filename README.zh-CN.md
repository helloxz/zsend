# ZSend

[English README](./README.md)

ZSend 是一个基于 Cloudflare Workers 的 SMTP 转 HTTP 发信服务。它对外提供 HTTP API，请求经过 Bearer Token 校验后，会根据请求中的发件人地址匹配对应的 SMTP 配置，通过 `worker-mailer` 发出邮件，并将发送结果记录到 Cloudflare D1。

## 项目特性

- 基于 Cloudflare Workers 和 `Hono`
- 通过 HTTP 接口发送邮件，支持多 SMTP 账号
- 按请求里的 `from` 地址精确匹配 SMTP 账号
- 支持 `text`、`html`、`markdown` 三种正文类型
- SMTP 发送失败时自动重试一次
- 将邮件发送结果写入 Cloudflare D1
- 发信接口使用 Bearer Token 鉴权

## 项目结构

- Worker 入口：`src/index.ts`
- 路由挂载：`src/routers.ts`
- API 处理逻辑：`src/api/`
- 可复用函数：`src/utils/`
- 中间件：`src/middleware/`
- D1 日志表与数据库逻辑：`src/db/`

当前发信接口为 `POST /api/v1/send`，根路径 `GET /` 返回一个简单的 JSON 响应，可用于基础探活。

## 返回结构

项目中的 JSON 返回统一采用以下结构：

```json
{
  "code": 200,
  "msg": "...",
  "data": {}
}
```

## 运行要求

- `bun`
- Cloudflare 账号
- Wrangler
- 至少一个可用的 SMTP 账号
- 一个绑定名为 `DB` 的 Cloudflare D1 数据库

## 本地开发

安装依赖：

```bash
bun install
```

先创建本地环境变量文件：

```bash
cp .dev.vars.example .dev.vars
```

然后编辑 `.dev.vars`，填入你自己的本地配置：

- `TOKEN`
- `SMTP_CONFIGS`

启动本地开发：

```bash
bun run dev
```

补充说明：

- Wrangler 会从 `.dev.vars` 加载本地变量
- `.dev.vars` 已被 git 忽略，只用于本地开发
- `.dev.vars.example` 是给其他用户和新环境使用的模板文件
- 本地开发端口固定为 `8000`，配置在 `wrangler.jsonc`
- Worker 入口文件为 `src/index.ts`
- 当前仓库没有配置 `test`、`lint`、`typecheck` 脚本

## 配置说明

当前 Worker 使用以下绑定：

| 绑定名 | 类型 | 是否必需 | 说明 |
| --- | --- | --- | --- |
| `TOKEN` | string | 是 | `POST /api/v1/send` 的 Bearer Token |
| `SMTP_CONFIGS` | 数组或 JSON 字符串 | 是 | SMTP 配置列表，用于按 `from` 匹配发信账号 |
| `DB` | D1 绑定 | 是 | 用于保存邮件发送日志 `mail_logs` |

### `SMTP_CONFIGS` 结构

每个 SMTP 配置项建议如下：

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

字段说明：

- `host`：SMTP 服务器地址
- `port`：SMTP 端口
- `username`：SMTP 登录账号，同时也是实际发信邮箱地址
- `password`：SMTP 密码
- `protocol`：填 `ssl` 时按隐式 TLS 发送，否则按 STARTTLS 处理
- `senderName`：该 SMTP 账号默认显示的发件人名称

当前代码兼容两种 `SMTP_CONFIGS` 注入形式：

- 本地开发时通过 `.dev.vars` 以 JSON 字符串注入
- 生产环境中以 JSON 字符串方式注入

生产环境更推荐第二种，即把完整配置序列化后作为字符串注入。

### 本地 `.dev.vars` 示例

```env
TOKEN=your-local-token
SMTP_CONFIGS=[{"host":"smtp.example.com","port":587,"username":"no-reply@example.com","password":"your-smtp-password","protocol":"tls","senderName":"ZSend"}]
```

文件说明：

- `.dev.vars`：本地实际配置，不提交仓库
- `.dev.vars.example`：仓库内的模板文件，不包含真实密钥

## API 使用说明

### 健康检查

```http
GET /
```

示例返回：

```json
{
  "code": 200,
  "msg": "Hello World!",
  "data": null
}
```

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

- `from`：必填，必须精确匹配某个 `SMTP_CONFIGS[].username`
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

请求被接受后的示例响应：

```json
{
  "code": 200,
  "msg": "Email request accepted",
  "data": {
    "from": "no-reply@example.com",
    "to": "user@example.com",
    "title": "欢迎使用"
  }
}
```

接口行为说明：

- Bearer Token 缺失或无效时返回 `401`
- 请求体不是合法 JSON 时返回 `400`
- 缺少必填字段时返回 `400`
- `type` 非法时返回 `400`
- `from` 没有匹配到 SMTP 配置时返回 `400`
- HTTP 接口在请求被接受后就会返回，实际发信和日志写入通过 `waitUntil` 异步完成
- SMTP 首次发送失败后，会等待 10 秒再重试一次

## D1 邮件日志

Worker 会把发信结果写入 `mail_logs` 表。

日志中会记录：

- 发件人和收件人邮箱
- 邮件主题
- 发件人显示名称
- 正文类型
- 实际使用的 SMTP 用户名
- 最终状态：`success` 或 `failed`
- 失败时的错误信息
- 请求 IP
- 清洗后的纯文本正文内容，便于后续搜索和查看

当前 Worker 会在处理请求前自动检查并创建 `mail_logs` 表及相关索引。如果没有配置 `DB` 绑定，Worker 在处理请求时会直接报错。

相关文件：

- `src/db/index.ts`
- `src/db/schema.sql`

## 部署到 Cloudflare Workers

### 1. 安装依赖

```bash
bun install
```

### 2. 创建 D1 数据库

```bash
wrangler d1 create zsend
```

创建完成后，把返回结果中的 `database_name` 和 `database_id` 写入 `wrangler.jsonc` 的 `d1_databases` 配置中，并保持绑定名为 `DB`。

### 3. 配置 Worker 绑定

本地开发请使用 `.dev.vars`，生产环境不要把真实敏感信息长期写在仓库里，而应通过 Cloudflare 注入。

更推荐的生产环境做法：

- `TOKEN` 使用 Cloudflare Secret 注入
- `SMTP_CONFIGS` 序列化为 JSON 字符串后，通过 Secret 注入
- 版本库中只保留非敏感或示例配置

示例命令：

```bash
wrangler secret put TOKEN
wrangler secret put SMTP_CONFIGS
```

建议注入的 `SMTP_CONFIGS` 字符串内容示例：

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

### 4. 生成 Cloudflare 绑定类型

```bash
bun run cf-typegen
```

### 5. 部署

```bash
bun run deploy
```

部署成功后，Cloudflare 会返回 Worker 的访问地址，随后就可以调用：

- `GET /`
- `POST /api/v1/send`

## 安全建议

- 不要把真实 SMTP 密码提交到仓库
- 不要把生产环境 `TOKEN` 长期保存在 `wrangler.jsonc`
- 敏感信息优先使用 Cloudflare Secrets 注入
- 生产环境中的 `SMTP_CONFIGS` 推荐使用 JSON 字符串形式注入
- 发信 Token 具备真实发信能力，必须妥善保管
- 只暴露你确定允许通过该接口发送邮件的 SMTP 账号

## 常用命令

```bash
bun run dev
bun run deploy
bun run cf-typegen
```
