import { bearerAuth } from "hono/bearer-auth";
import type { AppBindings } from "../types/env";

export const authMiddleware = () => {
    return async (c: any, next: any) => {
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
    };
};
