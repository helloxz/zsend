import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import {index} from "./api/index";
import {send} from "./api/send";
import type { AppBindings } from "./types/env";

export const router = new Hono<AppBindings>();

router.get("/",index);
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

        // 发信接口强制要求 Bearer Token；认证失败时统一返回项目约定的 JSON 结构。
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
