import { Context } from "hono";
import type { AppBindings } from "../types/env";

export const index = async (c: Context<AppBindings>) => {
    return c.json({
        code: 200,
        msg: "Hello World!",
        data: null,
    });
};
