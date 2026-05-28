import { Hono } from 'hono'
import type { ExecutionContext } from 'hono'
import { ensureMailLogsTable, ensureSmtpAccountsTable } from './db'
import { router } from './routers'
import type { AppBindings } from './types/env'

const app = new Hono<AppBindings>()

let dbInitPromise: Promise<void> | null = null

const ensureDatabaseReady = (env: AppBindings["Bindings"]) => {
    if (!dbInitPromise) {
        dbInitPromise = Promise.all([
            ensureMailLogsTable(env.DB),
            ensureSmtpAccountsTable(env.DB),
        ]).then(() => {}).catch((error) => {
            dbInitPromise = null
            throw error
        })
    }

    return dbInitPromise
}

app.route('/', router)

export default {
    async fetch(request: Request, env: AppBindings["Bindings"], ctx: ExecutionContext) {
        await ensureDatabaseReady(env)
        return app.fetch(request, env, ctx)
    },
}
