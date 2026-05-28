import { Context } from "hono";
import {
    querySmtpAccounts,
    insertSmtpAccount,
    updateSmtpAccount,
    deleteSmtpAccount,
    getSmtpAccountById,
} from "../db";
import type { AppBindings } from "../types/env";

// GET /api/v1/accounts — 分页获取 SMTP 账号列表
export const listAccounts = async (c: Context<AppBindings>) => {
    const page = Number(c.req.query("page")) || 1;
    const pageSize = Number(c.req.query("pageSize")) || 20;

    const result = await querySmtpAccounts(c.env.DB, page, pageSize);

    return c.json({
        code: 200,
        msg: "ok",
        data: result,
    });
};

// GET /api/v1/accounts/:id — 获取单个账号
export const getAccount = async (c: Context<AppBindings>) => {
    const id = c.req.param("id");
    if (!id) {
        return c.json({ code: 400, msg: "Missing account id", data: null });
    }

    const account = await getSmtpAccountById(c.env.DB, id);

    if (!account) {
        return c.json({ code: 404, msg: "Account not found", data: null });
    }

    return c.json({ code: 200, msg: "ok", data: account });
};

// POST /api/v1/accounts — 新增 SMTP 账号
export const createAccount = async (c: Context<AppBindings>) => {
    let body: Record<string, unknown>;

    try {
        body = await c.req.json();
    } catch {
        return c.json({ code: 400, msg: "Invalid JSON body", data: null });
    }

    const { host, port, username, password } = body;

    // 必填字段校验
    if (!host || !port || !username || !password) {
        return c.json({
            code: 400,
            msg: "Missing required fields: host, port, username, password",
            data: null,
        });
    }

    const account = await insertSmtpAccount(c.env.DB, {
        host: String(host),
        port: Number(port),
        username: String(username),
        password: String(password),
        fromEmail: body.fromEmail ? String(body.fromEmail) : undefined,
        senderName: body.senderName ? String(body.senderName) : undefined,
        protocol: body.protocol ? String(body.protocol) : undefined,
        enabled: body.enabled !== undefined ? Number(body.enabled) : undefined,
        remark: body.remark ? String(body.remark) : undefined,
    });

    return c.json({ code: 200, msg: "Account created", data: account });
};

// PUT /api/v1/accounts/:id — 更新 SMTP 账号
export const updateAccount = async (c: Context<AppBindings>) => {
    const id = c.req.param("id");
    if (!id) {
        return c.json({ code: 400, msg: "Missing account id", data: null });
    }

    let body: Record<string, unknown>;

    try {
        body = await c.req.json();
    } catch {
        return c.json({ code: 400, msg: "Invalid JSON body", data: null });
    }

    // 至少需要传一个可更新的字段
    const allowedFields = ["host", "port", "username", "password", "fromEmail", "senderName", "protocol", "enabled", "remark"];
    const hasValidField = allowedFields.some((f) => body[f] !== undefined);

    if (!hasValidField) {
        return c.json({ code: 400, msg: "No valid fields to update", data: null });
    }

    const payload: Record<string, unknown> = {};
    if (body.host !== undefined) payload.host = String(body.host);
    if (body.port !== undefined) payload.port = Number(body.port);
    if (body.username !== undefined) payload.username = String(body.username);
    if (body.password !== undefined) payload.password = String(body.password);
    if (body.fromEmail !== undefined) payload.fromEmail = body.fromEmail ? String(body.fromEmail) : null;
    if (body.senderName !== undefined) payload.senderName = body.senderName ? String(body.senderName) : null;
    if (body.protocol !== undefined) payload.protocol = body.protocol ? String(body.protocol) : null;
    if (body.enabled !== undefined) payload.enabled = Number(body.enabled);
    if (body.remark !== undefined) payload.remark = body.remark ? String(body.remark) : null;

    const updated = await updateSmtpAccount(c.env.DB, id, payload);

    if (!updated) {
        return c.json({ code: 404, msg: "Account not found", data: null });
    }

    return c.json({ code: 200, msg: "Account updated", data: updated });
};

// DELETE /api/v1/accounts/:id — 删除 SMTP 账号
export const removeAccount = async (c: Context<AppBindings>) => {
    const id = c.req.param("id");
    if (!id) {
        return c.json({ code: 400, msg: "Missing account id", data: null });
    }

    const deleted = await deleteSmtpAccount(c.env.DB, id);

    if (!deleted) {
        return c.json({ code: 404, msg: "Account not found", data: null });
    }

    return c.json({ code: 200, msg: "Account deleted", data: null });
};
