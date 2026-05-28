export type AppD1Statement = {
    bind: (...values: unknown[]) => AppD1Statement;
    first: <T = unknown>() => Promise<T | null>;
    all: <T = unknown>() => Promise<{ results?: T[] }>;
    run: () => Promise<{ meta: { changes: number } }>;
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
