import type { Context } from "hono";
import type { AppBindings } from "../types/env";
import { queryMailLogs } from "../db";

export const logs = async (c: Context<AppBindings>) => {
    const email = c.req.query("email") || undefined;
    const page = parseInt(c.req.query("page") || "1", 10);
    const pageSize = parseInt(c.req.query("pageSize") || "20", 10);

    const result = await queryMailLogs(c.env.DB, {
        email,
        page,
        pageSize,
    });

    return c.json({
        code: 200,
        msg: "OK",
        data: result,
    });
};
