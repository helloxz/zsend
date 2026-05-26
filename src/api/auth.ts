import type { Context } from "hono";
import type { AppBindings } from "../types/env";

export const auth = async (c: Context<AppBindings>) => {
    const body = await c.req.json<{ token?: string }>().catch(() => null);

    if (!body?.token) {
        return c.json({
            code: 400,
            msg: "Token is required",
            data: null,
        });
    }

    const serverToken = c.env.TOKEN;

    if (!serverToken) {
        return c.json({
            code: 500,
            msg: "Server token is not configured",
            data: null,
        });
    }

    if (body.token !== serverToken) {
        return c.json({
            code: 401,
            msg: "Invalid token",
            data: null,
        });
    }

    return c.json({
        code: 200,
        msg: "OK",
        data: null,
    });
};
