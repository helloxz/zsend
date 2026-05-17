export type AppD1Statement = {
    bind: (...values: unknown[]) => AppD1Statement;
    run: () => Promise<unknown>;
};

export type AppD1Database = {
    prepare: (query: string) => AppD1Statement;
};

export type AppBindings = {
    Bindings: {
        DB?: AppD1Database;
        TOKEN?: string;
        SMTP_CONFIGS?: unknown;
    };
};
