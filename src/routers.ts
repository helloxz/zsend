import { Hono } from "hono";
import { index } from "./api/index";
import { send } from "./api/send";
import { auth } from "./api/auth";
import { logs } from "./api/logs";
import { listAccounts, getAccount, createAccount, updateAccount, removeAccount } from "./api/accounts";
import { indexPage } from "./pages/index";
import { authMiddleware } from "./middleware/auth";
import type { AppBindings } from "./types/env";

export const router = new Hono<AppBindings>();

// ─── API 路由 ──────────────────────────────────────────────────

router.get("/api/health", index);

router.post("/api/v1/auth", auth);

router.get("/api/v1/logs", authMiddleware(), logs);

router.post("/api/v1/send", authMiddleware(), send);

// SMTP 账号管理（需认证）
router.get("/api/v1/accounts", authMiddleware(), listAccounts);
router.get("/api/v1/accounts/:id", authMiddleware(), getAccount);
router.post("/api/v1/accounts", authMiddleware(), createAccount);
router.put("/api/v1/accounts/:id", authMiddleware(), updateAccount);
router.delete("/api/v1/accounts/:id", authMiddleware(), removeAccount);

// ─── 前端 SPA catch-all ───────────────────────────────────────
// 所有非 API 路径统一返回 SPA HTML，由 Vue Router 在客户端处理路由
router.get("/*", (c) => {
    return c.html(indexPage().toString());
});
