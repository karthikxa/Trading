import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const API_BASE = process.env.TEST_API_BASE || 'https://zed-workspace.onrender.com';
const WEB_BASE = process.env.TEST_WEB_BASE || 'https://zed-workspace.onrender.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Content-Type': 'application/json',
};

describe('Dhan OAuth & Connector Lifecycle', () => {
  it('connect endpoint returns official Dhan consent start popup URL', async () => {
    const res = await fetch(`${API_BASE}/v1/connectors/projects/trading/connectors/dhan/connect`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 200);
    const data = (await res.json()) as { connectUrl?: string; connectionId?: string };
    assert.equal(data.connectUrl, '/api/dhan/auth/start?popup=1');
    assert.ok(data.connectionId);
  });

  it('/api/dhan/auth/start?popup=1 redirects to official Dhan Consent Login using App ID & Secret', async () => {
    const res = await fetch(`${WEB_BASE}/api/dhan/auth/start?popup=1`, {
      redirect: 'manual',
      headers: HEADERS,
    });
    assert.ok(res.status === 307 || res.status === 302, `Expected redirect, got ${res.status}`);
    const location = res.headers.get('location') || '';
    assert.ok(
      location.startsWith('https://auth.dhan.co/login/consentApp-login?consentAppId='),
      `Expected official Dhan consent login URL, got: ${location}`,
    );
  });

  it('removing connector clears all Dhan auth sessions and returns empty installed list', async () => {
    const delConnector = await fetch(`${API_BASE}/v1/connectors/projects/trading/connectors/dhan`, {
      method: 'DELETE',
      headers: HEADERS,
    });
    assert.equal(delConnector.status, 200);

    const delStatus = await fetch(`${WEB_BASE}/api/dhan/auth/status`, {
      method: 'DELETE',
      headers: HEADERS,
    });
    assert.equal(delStatus.status, 200);
    const statusBody = (await delStatus.json()) as { ok: boolean; connected: boolean };
    assert.equal(statusBody.connected, false);

    const installedRes = await fetch(`${WEB_BASE}/api/connectors?mode=installed`, {
      headers: HEADERS,
    });
    assert.equal(installedRes.status, 200);
    const installedBody = (await installedRes.json()) as { connectors: unknown[]; total: number };
    assert.equal(installedBody.total, 0);
    assert.equal(installedBody.connectors.length, 0);
  });
});
