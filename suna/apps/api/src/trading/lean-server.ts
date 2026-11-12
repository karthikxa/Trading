/**
 * Memory-lean API entrypoint for single-container / Render free-tier (512 MB)
 * deployments focused on the Trading Workspace & Journal.
 *
 * Mounts only the core HTTP middleware, health/config/client probes, headless
 * auth routes, FreeLLMAPI gateway, and `/v1/trading/*` (Supabase JWT/dev-token
 * protected) without loading the heavy project/IAM/sandbox worker graphs.
 */
import { sql } from 'drizzle-orm';
import { config } from '../config';
import { installHttpMiddleware } from '../http-middleware';
import { installHttpErrors } from '../http-errors';
import { supabaseAuth } from '../middleware/auth';
import { headlessAuthRouter } from '../auth/headless';
import { makeOpenApiApp } from '../openapi';
import { registerClientRoutes } from '../routes/clients';
import { previewConfig } from '../sandbox-proxy/routes/preview-config';
import { db } from '../shared/db';
import { logger } from '../lib/logger';
import { tradingApp, tradingChartsPublicApp } from './routes';
import { tradingGatewayApp } from './gateway';

const app = makeOpenApiApp();

installHttpMiddleware(app);

const healthBody = () => ({
  status: 'ok' as const,
  service: 'kortix-api',
  mode: 'trading-lean',
  timestamp: new Date().toISOString(),
});

app.get('/', (c) => c.json(healthBody(), 200));
app.get('/health', (c) => c.json(healthBody(), 200));
app.get('/v1/health', async (c) => {
  if (c.req.query('deep') === '1') {
    try {
      await db.execute(sql`SELECT 1`);
      return c.json({ ...healthBody(), db: 'ok' }, 200);
    } catch (err) {
      return c.json(
        {
          status: 'degraded',
          service: 'kortix-api',
          mode: 'trading-lean',
          db: err instanceof Error ? err.message.slice(0, 120) : 'error',
          timestamp: new Date().toISOString(),
        },
        503,
      );
    }
  }
  return c.json(healthBody(), 200);
});

registerClientRoutes(app);
app.route('/v1/p/config', previewConfig);
app.route('/v1/auth', headlessAuthRouter);

app.route('/v1/trading-charts', tradingChartsPublicApp);
app.use('/v1/trading', supabaseAuth);
app.use('/v1/trading/*', supabaseAuth);
app.route('/v1/trading', tradingApp);
app.route('/v1', tradingGatewayApp);

installHttpErrors(app);

const server = Bun.serve({
  port: config.PORT,
  idleTimeout: 0,
  fetch: app.fetch,
});

logger.info(`Lean Trading API listening on http://127.0.0.1:${server.port} (rss=${Math.round(process.memoryUsage().rss / 1048576)}MB)`);

// Non-blocking startup connectivity check + storage verification log
void db
  .execute(sql`SELECT 1`)
  .then(() => {
    logger.info('PostgreSQL connection verified (trading-lean)');
  })
  .catch((err) => {
    logger.error('PostgreSQL startup connectivity check failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  });

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    logger.info(`Shutting down Lean Trading API on ${sig}`);
    server.stop(true);
    process.exit(0);
  });
}

