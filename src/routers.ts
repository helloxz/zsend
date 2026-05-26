import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { index } from "./api/index";
import { send } from "./api/send";
import { auth } from "./api/auth";
import { logs } from "./api/logs";
import { indexPage } from "./pages/index";
import type { AppBindings } from "./types/env";

export const router = new Hono<AppBindings>();

router.get("/", (c) => {
    return c.html(indexPage().toString());
});

router.get("/api/health", index);

router.post("/api/v1/auth", auth);

router.get(
    "/api/v1/logs",
    async (c, next) => {
        const token = c.env.TOKEN;

        if (!token) {
            return c.json({
                code: 500,
                msg: "Server token is not configured",
                data: null,
            });
        }

        const middleware = bearerAuth<AppBindings>({
            token,
            noAuthenticationHeader: {
                message: {
                    code: 401,
                    msg: "Authorization header is required",
                    data: null,
                },
            },
            invalidAuthenticationHeader: {
                message: {
                    code: 401,
                    msg: "Invalid authorization header",
                    data: null,
                },
            },
            invalidToken: {
                message: {
                    code: 401,
                    msg: "Invalid token",
                    data: null,
                },
            },
        });

        return middleware(c, next);
    },
    logs
);

router.post(
    "/api/v1/send",
    async (c, next) => {
        const token = c.env.TOKEN;

        if (!token) {
            return c.json({
                code: 500,
                msg: "Server token is not configured",
                data: null,
            });
        }

        const middleware = bearerAuth<AppBindings>({
            token,
            noAuthenticationHeader: {
                message: {
                    code: 401,
                    msg: "Authorization header is required",
                    data: null,
                },
            },
            invalidAuthenticationHeader: {
                message: {
                    code: 401,
                    msg: "Invalid authorization header",
                    data: null,
                },
            },
            invalidToken: {
                message: {
                    code: 401,
                    msg: "Invalid token",
                    data: null,
                },
            },
        });

        return middleware(c, next);
    },
    send
);
