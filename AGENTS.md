# Zend

## 项目事实
- 这是一个运行在 Cloudflare Workers 上的 SMTP 转 HTTP 服务：对外暴露 HTTP 接口，服务端再通过 `worker-mailer` 调用已配置的 SMTP 发送邮件。
- Worker 入口是 `src/index.ts`，Wrangler 入口配置在 `wrangler.jsonc` 的 `main: "src/index.ts"`。
- HTTP 路由统一从 `src/routers.ts` 挂载；当前入口用 `app.route('/', router)` 接入。
- API 核心代码放在 `src/api/`。
- 可复用函数放在 `src/utils/`。
- 中间件放在 `src/middleware/`。

## 返回约定
- 所有 `c.json(...)` 返回值统一使用下面的结构，不要自行变形：

```ts
{
  code: xxx,
  msg: "xxx",
  data: data,
}
```

## 开发命令
- 按仓库现有文档执行：`bun install`
- 本地开发：`bun run dev`
- 部署：`bun run deploy`
- 更新 Cloudflare 绑定类型：`bun run cf-typegen`
- 仓库当前没有配置 `test`、`lint`、`typecheck` 脚本；不要臆造校验命令。

## Cloudflare / 配置注意事项
- `wrangler.jsonc` 已启用 `nodejs_compat`。
- 本地开发端口固定为 `8000`，配置在 `wrangler.jsonc` 的 `dev.port`。
- `SMTP_CONFIGS` 目前通过 Wrangler `vars` 注入，值是 JSON 字符串；读写该配置时先确认是否需要序列化 / 反序列化。

## 代码风格提示
- 当前代码同时存在单双引号混用；在你修改的文件里保持风格一致，避免顺手做无关格式化。
- 如果新增邮件发送相关接口，优先沿用现有 `Hono` handler 组织方式：路由放 `src/routers.ts`，处理逻辑放 `src/api/`。
