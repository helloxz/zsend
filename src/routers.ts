import { Hono } from "hono";
import { index } from "./api/index";
import { send } from "./api/send";
import { auth } from "./api/auth";
import { logs } from "./api/logs";
import { config } from "./api/config";
import { indexPage } from "./pages/index";
import { authMiddleware } from "./middleware/auth";
import type { AppBindings } from "./types/env";

export const router = new Hono<AppBindings>();

router.get("/", (c) => {
    return c.html(indexPage().toString());
});

router.get("/api/health", index);

router.post("/api/v1/auth", auth);

router.get("/api/v1/logs", authMiddleware(), logs);

router.get("/api/v1/config", authMiddleware(), config);

router.post("/api/v1/send", authMiddleware(), send);
