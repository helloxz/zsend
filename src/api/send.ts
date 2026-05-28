import { marked } from "marked";
import { Context } from "hono";
import { WorkerMailer } from "worker-mailer";
import { insertMailLog, getAllEnabledSmtpAccounts } from "../db";
import type { SmtpAccount } from "../db";
import type { AppBindings, AppD1Database } from "../types/env";

type SendBody = {
    from?: string;
    to?: string | string[];
    title?: string;
    content?: string;
    type?: "text" | "html" | "markdown" | string;
    sender_name?: string;
};

type SmtpConfig = {
    host: string;
    port: number;
    username: string;
    password: string;
    fromEmail?: string;
    protocol?: string;
    senderName?: string;
};

type MailType = "text" | "html" | "markdown";

type PreparedMail = {
    from: string;
    smtpConfig: SmtpConfig;
    finalSenderName?: string;
    to: string | string[];
    title: string;
    mailType: MailType;
    text: string;
    html: string;
    contentText: string;
    requestIp?: string | null;
};

type SendMailResult = {
    status: "success" | "failed";
    errorMessage?: string;
};

// 将 D1 中的 SmtpAccount 转换为发送时使用的 SmtpConfig 格式
const accountToSmtpConfig = (account: SmtpAccount): SmtpConfig => ({
    host: account.host,
    port: account.port,
    username: account.username,
    password: account.password,
    fromEmail: account.from_email ?? undefined,
    protocol: account.protocol ?? undefined,
    senderName: account.sender_name ?? undefined,
});

const escapeHtml = (value: string) => {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
};

const normalizeType = (type?: string): MailType | null => {
    if (!type) {
        return "text";
    }

    if (type === "text" || type === "html" || type === "markdown") {
        return type;
    }

    return null;
};

const getSmtpFromEmail = (smtpConfig: SmtpConfig) => {
    const fromEmail = smtpConfig.fromEmail?.trim();
    return fromEmail || smtpConfig.username;
};

const findSmtpConfig = (smtpConfigs: SmtpConfig[], from: string) => {
    const matchedByFromEmail = smtpConfigs.find((item) => item.fromEmail?.trim() === from);

    if (matchedByFromEmail) {
        return matchedByFromEmail;
    }

    return smtpConfigs.find((item) => item.username === from);
};

const buildTextContent = (content: string, type: MailType) => {
    if (type === "html") {
        // 纯文本副本用于部分邮件客户端预览；这里做轻量去标签，避免把整段 HTML 原样塞进去。
        return content
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">")
            .replace(/\s+/g, " ")
            .trim();
    }

    return content;
};

const decodeHtmlEntities = (value: string) => {
    return value
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
};

const extractLogContent = (html: string) => {
    // 日志里不保留富文本标签，只存清洗后的纯文本，方便后台直接查看和搜索正文内容。
    return decodeHtmlEntities(
        html
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n")
            .replace(/<\/div>/gi, "\n")
            .replace(/<\/li>/gi, "\n")
            .replace(/<\/tr>/gi, "\n")
            .replace(/<[^>]+>/g, " ")
    )
        .replace(/\r/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/[ \t]+/g, " ")
        .replace(/ *\n */g, "\n")
        .trim();
};

const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const buildHtml = async (title: string, content: string, type: MailType) => {
    // markdown 交给 marked 转成 HTML；text 保留换行；html 则直接使用调用方传入的内容。
    const body = type === "markdown"
        ? String(await marked.parse(content))
        : type === "html"
            ? content
            : `<p>${escapeHtml(content).replaceAll("\n", "<br />")}</p>`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #f6f8fb;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #1f2937;
    }

    .page {
      width: 100%;
      padding: 24px 12px;
      box-sizing: border-box;
      background: #f6f8fb;
    }

    .card {
      width: 100%;
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e7ebf0;
      border-radius: 14px;
      box-shadow: 0 6px 20px rgba(15, 23, 42, 0.04);
    }

    .content {
      padding: 28px 30px;
      font-size: 16px;
      line-height: 1.75;
      color: #334155;
      word-break: break-word;
    }

    .content p,
    .content ul,
    .content ol,
    .content blockquote,
    .content pre,
    .content table,
    .content h1,
    .content h2,
    .content h3,
    .content h4,
    .content h5,
    .content h6 {
      margin-top: 0;
      margin-bottom: 16px;
    }

    .content h1,
    .content h2,
    .content h3,
    .content h4,
    .content h5,
    .content h6 {
      color: #111827;
      line-height: 1.4;
    }

    .content a {
      color: #2563eb;
      text-decoration: none;
    }

    .content blockquote {
      margin-left: 0;
      padding: 10px 14px;
      border-left: 3px solid #93c5fd;
      background: #f8fbff;
      color: #475569;
      border-radius: 0 8px 8px 0;
    }

    .content code {
      padding: 2px 6px;
      background: #f1f5f9;
      border-radius: 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 14px;
    }

    .content pre {
      overflow-x: auto;
      padding: 14px 16px;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 10px;
    }

    .content pre code {
      padding: 0;
      background: transparent;
      color: inherit;
    }

    .content img {
      max-width: 100%;
      height: auto;
      border-radius: 12px;
    }

    .content table {
      width: 100%;
      border-collapse: collapse;
      display: block;
      overflow-x: auto;
    }

    .content th,
    .content td {
      padding: 10px 12px;
      border: 1px solid #e7ebf0;
      text-align: left;
    }

    @media only screen and (max-width: 640px) {
      .page {
        padding: 12px 8px;
      }

      .content {
        padding: 20px 18px;
        font-size: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="card">
      <div class="content">
        ${body}
      </div>
    </div>
  </div>
</body>
</html>`;
};

const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const sendEmail = async (mail: PreparedMail) => {
    const protocol = mail.smtpConfig.protocol?.toLowerCase();
    const fromEmail = getSmtpFromEmail(mail.smtpConfig);

    // protocol=ssl 走 465 这类隐式 TLS；其他情况默认按 STARTTLS 方式发信。
    await WorkerMailer.send(
        {
            host: mail.smtpConfig.host,
            port: mail.smtpConfig.port,
            secure: protocol === "ssl",
            startTls: protocol !== "ssl",
            // worker-mailer 不会自动选择认证方式；这里显式指定 plain，避免出现
            // "No supported auth method found." 的认证失败。
            authType: "plain",
            credentials: {
                username: mail.smtpConfig.username,
                password: mail.smtpConfig.password,
            },
        },
        {
            // SMTP 登录账号和发件邮箱允许分离；未单独配置发件邮箱时回退到 username。
            // 发件人名称允许被请求参数覆盖，便于同一 SMTP 账号下按业务场景展示不同名称。
            from: {
                name: mail.finalSenderName,
                email: fromEmail,
            },
            to: mail.to,
            subject: mail.title,
            text: mail.text,
            html: mail.html,
        }
    );
};

const writeMailLog = async (db: AppD1Database | undefined, mail: PreparedMail, result: SendMailResult) => {
    await insertMailLog(db, {
        fromEmail: getSmtpFromEmail(mail.smtpConfig),
        toEmail: Array.isArray(mail.to) ? mail.to.join(",") : mail.to,
        subject: mail.title,
        senderName: mail.finalSenderName,
        mailType: mail.mailType,
        smtpUsername: mail.smtpConfig.username,
        status: result.status,
        errorMessage: result.errorMessage,
        requestIp: mail.requestIp,
        contentText: mail.contentText,
    });
};

const sendEmailWithRetry = async (mail: PreparedMail): Promise<SendMailResult> => {
    const fromEmail = getSmtpFromEmail(mail.smtpConfig);

    try {
        await sendEmail(mail);
        return {
            status: "success",
        };
    } catch (firstError) {
        // 首次发送失败后等待 10 秒再重试一次，避免瞬时网络抖动直接导致发送失败。
        await sleep(10000);

        try {
            await sendEmail(mail);
            return {
                status: "success",
            };
        } catch (secondError) {
            const firstMessage = firstError instanceof Error ? firstError.message : String(firstError);
            const secondMessage = secondError instanceof Error ? secondError.message : String(secondError);
            const finalErrorMessage = `First attempt: ${firstMessage}; Retry failed: ${secondMessage}`;

            // 只打印排查所需的业务字段，不输出 SMTP 密码等敏感信息。
            console.error("Send email failed after retry", {
                from: fromEmail,
                to: mail.to,
                title: mail.title,
                senderName: mail.finalSenderName,
                firstError: firstMessage,
                secondError: secondMessage,
            });

            return {
                status: "failed",
                errorMessage: finalErrorMessage,
            };
        }
    }
};

export const send = async (c: Context<AppBindings>) => {
    try {
        let body: SendBody;

        try {
            // 请求体必须是合法 JSON；这里单独拦截解析错误，返回更明确的调用提示。
            body = await c.req.json<SendBody>();
        } catch {
            return c.json({
                code: 400,
                msg: "Invalid JSON body",
                data: null,
            });
        }

        const { from, to, title, content, type, sender_name } = body;
        const mailType = normalizeType(type);

        // 发送邮件至少需要发件人、收件人、标题和正文，这里先做基础字段校验。
        if (!from || !to || !title || !content) {
            return c.json({
                code: 400,
                msg: "Missing required fields",
                data: null,
            });
        }

        // 只允许 text、html、markdown 三种正文类型；不传时默认按 text 处理。
        if (!mailType) {
            return c.json({
                code: 400,
                msg: "Unsupported type, only text, html, markdown are allowed",
                data: null,
            });
        }

        // 统一将 to 归一化为字符串数组，过滤空串并去重。
        const toArray = Array.isArray(to) ? to : [to];
        const toList = [...new Set(toArray.map((t) => t.trim()).filter(Boolean))];

        if (toList.length === 0) {
            return c.json({
                code: 400,
                msg: "to must contain at least one valid email address",
                data: null,
            });
        }

        if (!toList.every(isValidEmail)) {
            return c.json({
                code: 400,
                msg: "to contains invalid email address",
                data: null,
            });
        }

        // 从 D1 读取所有启用的 SMTP 账号，转换为发件配置格式
        const enabledAccounts = await getAllEnabledSmtpAccounts(c.env.DB);
        const smtpConfigs = enabledAccounts.map(accountToSmtpConfig);
        // 先按 fromEmail 匹配；没命中再按 username 匹配，兼容前端继续传历史值。
        const smtpConfig = findSmtpConfig(smtpConfigs, from);

        if (!smtpConfig) {
            return c.json({
                code: 400,
                msg: "No matching SMTP account found for from address. Please check your SMTP accounts in the admin panel.",
                data: null,
            });
        }

        // 根据正文类型生成最终 HTML；title 仅作为邮件 subject 使用，不插入邮件正文模板。
        const html = await buildHtml(title, content, mailType);
        const text = buildTextContent(content, mailType);
        const contentText = extractLogContent(html);
        // 前端传了 sender_name 且不是空字符串时，优先使用它；否则回退到 SMTP 默认配置。
        const finalSenderName = sender_name?.trim() || smtpConfig.senderName;
        const requestIp = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || null;

        // 发信和日志都放到 waitUntil 中异步执行，接口快速返回，但日志里记录真实的最终发信结果。
        c.executionCtx.waitUntil(
            (async () => {
                const mail: PreparedMail = {
                    from,
                    smtpConfig,
                    finalSenderName,
                    to: toList,
                    title,
                    mailType,
                    text,
                    html,
                    contentText,
                    requestIp,
                };

                const result = await sendEmailWithRetry(mail);

                try {
                    await writeMailLog(c.env.DB, mail, result);
                } catch (logError) {
                    const logMessage = logError instanceof Error ? logError.message : String(logError);

                    // 日志写入失败不影响接口返回，但要保留错误信息，方便排查 D1 配置或 SQL 问题。
                    console.error("Write mail log failed", {
                        from,
                        to: toList,
                        title,
                        status: result.status,
                        logError: logMessage,
                    });
                }
            })()
        );

        return c.json({
            code: 200,
            msg: "Email request accepted",
            data: {
                from,
                to: toList,
                title,
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to send email";

        return c.json({
            code: 500,
            msg: message,
            data: null,
        });
    }
};
