import { Context } from "hono";
import type { AppBindings } from "../types/env";

type SmtpConfigSummary = {
    username: string;
    fromEmail: string;
    senderName: string;
};

const parseSmtpConfigs = (value: unknown): SmtpConfigSummary[] => {
    let configs: unknown[] = [];

    if (Array.isArray(value)) {
        configs = value;
    } else if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                configs = parsed;
            }
        } catch {
            return [];
        }
    }

    return configs.map((item: any) => ({
        username: item.username || "",
        fromEmail: item.fromEmail || "",
        senderName: item.senderName || "",
    }));
};

export const config = async (c: Context<AppBindings>) => {
    const smtpConfigs = parseSmtpConfigs(c.env.SMTP_CONFIGS);

    return c.json({
        code: 200,
        msg: "ok",
        data: smtpConfigs,
    });
};
