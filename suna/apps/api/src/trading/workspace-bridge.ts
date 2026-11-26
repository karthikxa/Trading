import { OpenAPIHono } from '@hono/zod-openapi';
import { sql } from 'drizzle-orm';
import { db } from '../shared/db';
import type { AppEnv } from '../types';

export const workspaceBridgeApp = new OpenAPIHono<AppEnv>();

// 1. Projects Detail & Summary (Resolves ProjectAccessBoundary on web)
const handleProjectSummary = (c: any) => {
  const pId = c.req.param('projectId') || 'trading';
  const normalizedId =
    pId === 'trading' || pId === 'trading-desk' || pId === 'desk'
      ? 'b0000000-0000-0000-0000-000000000001'
      : pId;
  const projectObj = {
    id: normalizedId,
    name: 'Trading Desk',
    slug: 'trading-desk',
    icon: null,
    icon_glyph: null,
    account_id: 'acc-default-workspace',
    created_at: '2026-11-20T00:00:00.000Z',
    updated_at: new Date().toISOString(),
  };
  return c.json(
    {
      ...projectObj,
      project: projectObj,
      config: {
        default_agent: 'portfolio_manager',
        open_code_default_agent: 'portfolio_manager',
        skills: [],
        commands: [],
        agents: [],
      },
      role: 'admin',
    },
    200,
  );
};

workspaceBridgeApp.get('/projects/:projectId', handleProjectSummary);
workspaceBridgeApp.get('/projects/:projectId/detail', handleProjectSummary);

// 2. Project Config
workspaceBridgeApp.get('/projects/:projectId/config', (c) => {
  return c.json(
    {
      default_agent: 'portfolio_manager',
      open_code_default_agent: 'portfolio_manager',
      skills: [],
      commands: [],
      agents: [],
    },
    200,
  );
});

// 3. Project Cans (Permissions)
const handleCans = (c: any) => {
  return c.json(
    {
      allowed: true,
      cans: {
        project_settings_write: { allowed: true },
        project_members_write: { allowed: true },
        project_connectors_write: { allowed: true },
        project_files_write: { allowed: true },
        project_drives_write: { allowed: true },
        project_agents_write: { allowed: true },
      },
    },
    200,
  );
};
workspaceBridgeApp.get('/projects/:projectId/cans', handleCans);
workspaceBridgeApp.post('/projects/:projectId/cans', handleCans);
workspaceBridgeApp.get('/cans', handleCans);
workspaceBridgeApp.post('/cans', handleCans);

// 4. Feature Flags
const handleFeatureFlags = (c: any) => {
  return c.json(
    {
      flags: {
        drives: true,
        reminders: true,
        loops: true,
        connectors: true,
        custom_agents: true,
      },
    },
    200,
  );
};
workspaceBridgeApp.get('/projects/:projectId/feature-flags', handleFeatureFlags);
workspaceBridgeApp.get('/feature-flags', handleFeatureFlags);

// 5. Apps list
workspaceBridgeApp.get('/projects/:projectId/apps', (c) => {
  return c.json({ apps: [] }, 200);
});
workspaceBridgeApp.post('/projects/:projectId/apps', (c) => {
  return c.json({ app: null }, 200);
});

// 6. Sessions list & metadata
workspaceBridgeApp.get('/projects/:projectId/sessions', (c) => {
  return c.json([], 200);
});
workspaceBridgeApp.post('/projects/:projectId/sessions', (c) => {
  return c.json(
    {
      session_id: 'session_' + Date.now(),
      project_id: c.req.param('projectId'),
      name: 'Trading Session',
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    200,
  );
});
workspaceBridgeApp.get('/projects/:projectId/sessions/:sessionId', (c) => {
  const sid = c.req.param('sessionId');
  return c.json(
    {
      session_id: sid,
      account_id: 'acc-default-workspace',
      project_id: c.req.param('projectId'),
      name: 'Trading Assistant',
      status: 'ready',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    200,
  );
});
workspaceBridgeApp.get('/projects/:projectId/sessions/:sessionId/log', (c) => {
  return c.json({ logs: [] }, 200);
});
workspaceBridgeApp.get('/projects/:projectId/sessions/:sessionId/transcript', (c) => {
  return c.json({ messages: [] }, 200);
});
workspaceBridgeApp.get('/projects/:projectId/sessions/:sessionId/turn', (c) => {
  return c.json({ turn: null }, 200);
});
workspaceBridgeApp.get('/projects/:projectId/sessions/:sessionId/prompts', (c) => {
  return c.json([], 200);
});
workspaceBridgeApp.post('/projects/:projectId/sessions/:sessionId/prompts', (c) => {
  return c.json({ id: 'prompt_1', status: 'queued' }, 200);
});

// 7. IAM Effective Permissions
workspaceBridgeApp.get('/accounts/:accountId/iam/members/:userId/effective', (c) => {
  const action = c.req.query('action') || 'project.read';
  return c.json(
    {
      allowed: true,
      reason: null,
      action,
    },
    200,
  );
});

workspaceBridgeApp.post('/accounts/:accountId/iam/members/:userId/effective:batch', async (c) => {
  let probes: Array<{ action: string; resourceType?: string; resourceId?: string }> = [];
  try {
    const body = (await c.req.json()) as { probes?: typeof probes };
    probes = body.probes || [];
  } catch {}
  const results = probes.map((p) => ({
    action: p.action,
    resource_type: p.resourceType ?? 'project',
    resource_id: p.resourceId ?? null,
    allowed: true,
    reason: null,
  }));
  return c.json({ results }, 200);
});

// 8. Billing account state
const handleBillingState = (c: any) => {
  return c.json(
    {
      can_manage_billing: true,
      subscription: {
        can_purchase_credits: true,
        tier: 'enterprise',
      },
      credits: {
        balance: 1000000,
      },
    },
    200,
  );
};
workspaceBridgeApp.get('/billing/account-state', handleBillingState);
workspaceBridgeApp.get('/billing/account-state/minimal', handleBillingState);

// 9. Connectors API
async function isDhanActiveInDb(projectId = 'trading'): Promise<boolean> {
  try {
    const res = await db.execute(
      sql`SELECT status, expires_at FROM public.dhan_connections WHERE id = ${`${projectId}:dhan`} LIMIT 1`,
    );
    const rows = (res as any)?.rows ?? (Array.isArray(res) ? res : []);
    const row = rows[0];
    if (!row) return Boolean(process.env.DHAN_ACCESS_TOKEN);
    if (row.status !== 'active') return false;
    if (row.expires_at && Date.now() >= new Date(row.expires_at).getTime()) {
      await db.execute(
        sql`UPDATE public.dhan_connections SET status = 'expired', disconnected_at = NOW(), updated_at = NOW() WHERE id = ${`${projectId}:dhan`}`,
      );
      return false;
    }
    return true;
  } catch {
    return Boolean(process.env.DHAN_ACCESS_TOKEN);
  }
}

async function markDhanDisconnectedInDb(projectId = 'trading'): Promise<void> {
  try {
    await db.execute(
      sql`INSERT INTO public.dhan_connections (id, project_id, status, disconnected_at, updated_at)
          VALUES (${`${projectId}:dhan`}, ${projectId}, 'disconnected', NOW(), NOW())
          ON CONFLICT (id) DO UPDATE SET status = 'disconnected', disconnected_at = NOW(), updated_at = NOW()`,
    );
  } catch {
    // Non-blocking fallback
  }
}

const handleConnectorsList = async (c: any) => {
  const isConnected = await isDhanActiveInDb('trading');
  if (!isConnected) {
    return c.json({ connectors: [] }, 200);
  }
  return c.json(
    {
      connectors: [
        {
          slug: 'dhan',
          name: 'Dhan',
          provider: 'composio',
          iconUrl: '/logos/dhan.svg',
          status: 'active',
          state: 'connected',
          credentialMode: 'shared',
          authorizationStrategy: 'project',
          sensitive: true,
          secretSet: true,
          actions: [
            { name: 'fundlimit', description: 'Real-time Cash balance & Collateral Limit' },
            { name: 'orders', description: 'Real-time Order Book and Trade History' },
            { name: 'positions', description: 'Real-time Open and Closed Positions' },
            { name: 'holdings', description: 'Demat Equity Holdings portfolio' },
            { name: 'placeorder', description: 'Execute Limit & Market orders' },
          ],
        },
      ],
    },
    200,
  );
};

workspaceBridgeApp.get('/connectors/projects/:projectId/connectors', handleConnectorsList);
workspaceBridgeApp.get('/connectors/projects/:projectId/connectors/dhan', handleConnectorsList);
workspaceBridgeApp.delete('/connectors/projects/:projectId/connectors/:slug', async (c) => {
  const slug = c.req.param('slug');
  if (slug === 'dhan' || slug.startsWith('dhan-')) {
    delete process.env.DHAN_ACCESS_TOKEN;
    await markDhanDisconnectedInDb('trading');
  }
  return c.json({ ok: true, deleted: slug }, 200);
});
workspaceBridgeApp.put('/projects/:projectId/connections/:connectionId/revoke', async (c) => {
  delete process.env.DHAN_ACCESS_TOKEN;
  await markDhanDisconnectedInDb('trading');
  return c.json({ ok: true }, 200);
});
workspaceBridgeApp.get('/connectors/projects/:projectId/connectors/dhan/accounts', (c) => {
  return c.json({ accounts: [] }, 200);
});
workspaceBridgeApp.get('/connectors/projects/:projectId/catalog', (c) => {
  return c.json({ catalog: [] }, 200);
});
workspaceBridgeApp.get('/connectors/projects/:projectId/discover/connectors', (c) => {
  return c.json([], 200);
});
workspaceBridgeApp.get('/connectors/projects/:projectId/discover/sections', (c) => {
  return c.json([], 200);
});
