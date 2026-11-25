import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import catalogData from '@/features/connectors/data/catalog-4000.json';
import composioToolkitsData from '@/features/connectors/data/composio_toolkits_1610.json';

interface ConnectorItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  provider: string;
  category: string;
  categories: string[];
  icon: string | null;
  domain?: string;
  kind: string;
  popularity: number;
  rank: number;
  isNoAuth?: boolean;
  directMcpUrl?: string;
  variants?: Array<{ id: string; kind: string; name: string; oneClick?: boolean }>;
}

const POPULAR_SLUGS = [
  'dhan', 'gmail', 'googlecalendar', 'slack', 'github_mcp', 'notion_mcp', 'linear_mcp',
  'googledrive', 'stripe_mcp', 'hubspot', 'jira', 'figma', 'airtable',
  'salesforce', 'discord', 'shopify', 'zendesk', 'asana', 'trello', 'clickup',
  'zoom', 'twitter', 'telegram', 'whatsapp', 'supabase', 'postgres', 'mongodb'
];

const DHAN_ITEM: ConnectorItem = {
  id: 'dhan',
  slug: 'dhan',
  name: 'Dhan',
  description: 'Connect and automate workflows with Dhan.',
  provider: 'composio',
  category: 'trading & finance',
  categories: ['trading & finance', 'broker', 'trading'],
  icon: '/logos/dhan.svg',
  domain: 'dhan.co',
  kind: 'composio',
  popularity: 10000,
  rank: 1,
  isNoAuth: false,
  variants: [
    { id: 'dhan-oauth', kind: 'composio', name: 'Dhan', oneClick: true },
  ],
};

// 17 native Kortix Trading Desk connectors
const KORTIX_ITEMS: ConnectorItem[] = ((catalogData as unknown as ConnectorItem[]) || [])
  .filter((c) => c.kind === 'kortix' || c.provider === 'kortix');

// Build 1,610 verified Composio Toolkits mapped to ConnectorItem
const COMPOSIO_ITEMS: ConnectorItem[] = (composioToolkitsData as any[]).map((t, idx) => {
  const slug = t.slug;
  const isPop = POPULAR_SLUGS.indexOf(slug);
  const popScore = isPop !== -1 ? 1000 - isPop : 50;
  const rawCat = (t.categories && t.categories[0]) ? t.categories[0].toLowerCase() : 'productivity & project management';
  const allCats = (t.categories && t.categories.length) ? t.categories.map((c: string) => c.toLowerCase()) : [rawCat];
  const name = t.name || slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  const description = t.description || t.short_description || `Universal AI Connector for ${name}. Seamlessly connect tools, triggers, and live data feeds.`;
  const icon = t.logo_url || `https://logos.composio.dev/api/${slug}`;

  return {
    id: `composio:${slug}`,
    slug: slug,
    name: name,
    description: description,
    provider: 'composio',
    category: rawCat,
    categories: allCats,
    icon: icon,
    domain: `${slug}.com`,
    kind: 'composio',
    popularity: popScore,
    rank: idx + 1,
    isNoAuth: false,
    variants: [
      { id: `${slug}-oauth`, kind: 'composio', name: 'Composio OAuth', oneClick: true },
      { id: `${slug}-mcp`, kind: 'mcp', name: 'Direct MCP', oneClick: true },
    ],
  };
}).sort((a, b) => b.popularity - a.popularity);

// Full catalog contains Dhan + all 1,610 Composio toolkits + 17 Kortix trading apps
const FULL_CATALOG: ConnectorItem[] = [DHAN_ITEM, ...COMPOSIO_ITEMS, ...KORTIX_ITEMS];

const inMemoryInstalled = new Set<string>();

function getInstalledSlugs(): Set<string> {
  const set = new Set<string>(inMemoryInstalled);
  try {
    const p = path.join(process.cwd(), 'src/features/connectors/data/installed-connectors.json');
    if (fs.existsSync(/*turbopackIgnore: true*/ p)) {
      const data = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ p, 'utf8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (typeof item === 'string' && item && !item.startsWith('conn_')) {
            set.add(item);
          }
        }
      }
    }
  } catch {}
  return set;
}

function saveInstalled(set: Set<string>): void {
  for (const item of set) {
    if (!item.startsWith('conn_')) inMemoryInstalled.add(item);
  }
  try {
    const p = path.join(process.cwd(), 'src/features/connectors/data/installed-connectors.json');
    const dir = path.dirname(p);
    if (!fs.existsSync(/*turbopackIgnore: true*/ dir)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
    }
    fs.writeFileSync(/*turbopackIgnore: true*/ p, JSON.stringify(Array.from(set).filter(s => !s.startsWith('conn_')), null, 2), 'utf8');
  } catch {}
}

async function checkComposioActiveConnection(slug: string): Promise<boolean> {
  const apiKey =
    process.env.COMPOSIO_API_KEY ||
    process.env.NEXT_PUBLIC_COMPOSIO_API_KEY ||
    'ck_1XxofHhReEgRH9hjdNRp';
  if (!apiKey || apiKey.includes('YOUR_')) return false;

  try {
    const cleanSlug = slug
      .toLowerCase()
      .replace(/^(composio|kortix|mcp|trading|openapi):/, '')
      .replace(/^conn_/, '')
      .replace(/_mcp$/i, '')
      .replace(/_\d+$/, '')
      .replace(/-[a-z0-9]{4,}$/i, '') || 'gmail';
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);

    const res = await fetch('https://connect.composio.dev/mcp', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-consumer-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'COMPOSIO_MANAGE_CONNECTIONS',
          arguments: { action: 'list', toolkits: [cleanSlug] },
        },
      }),
    });
    clearTimeout(timer);

    if (!res.ok) return false;
    const text = await res.text();
    return /"status"\s*:\s*"(active|ACTIVE)"/i.test(text);
  } catch (err) {
    // Fast fail silently on check timeout
  }
  return false;
}

async function getComposioOAuthLink(slug: string): Promise<string> {
  const cleanSlug = slug
    .toLowerCase()
    .replace(/^(composio|kortix|mcp|trading|openapi):/, '')
    .replace(/^conn_/, '')
    .replace(/_mcp$/i, '')
    .replace(/_\d+$/, '')
    .replace(/-[a-z0-9]{4,}$/i, '') || 'gmail';
  const fallbackUrl = `https://connect.composio.dev/app/${cleanSlug}`;

  const apiKey =
    process.env.COMPOSIO_API_KEY ||
    process.env.NEXT_PUBLIC_COMPOSIO_API_KEY ||
    'ck_1XxofHhReEgRH9hjdNRp';
  if (!apiKey || apiKey.includes('YOUR_')) return fallbackUrl;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch('https://connect.composio.dev/mcp', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-consumer-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'COMPOSIO_MANAGE_CONNECTIONS',
          arguments: { toolkits: [cleanSlug] },
        },
      }),
    });
    clearTimeout(timer);

    if (res.ok) {
      const text = await res.text();
      const linkMatch = text.match(/https:\/\/connect\.composio\.dev\/link\/[a-zA-Z0-9_\-]+/);
      if (linkMatch) {
        return linkMatch[0];
      }
    }
  } catch (err) {
    // Fast fallback
  }
  return fallbackUrl;
}

function getCatalog(): ConnectorItem[] {
  return FULL_CATALOG;
}

function findCatalogItem(queryIdOrSlug: string, catalog: ConnectorItem[]): ConnectorItem {
  const raw = (queryIdOrSlug || '').trim();
  const lower = raw.toLowerCase();
  const stripped = lower.replace(/^(composio|kortix|mcp|trading|openapi):/, '');

  const match = catalog.find(
    (c) =>
      c.id.toLowerCase() === lower ||
      c.slug.toLowerCase() === lower ||
      c.id.toLowerCase() === stripped ||
      c.slug.toLowerCase() === stripped ||
      c.id.toLowerCase().endsWith(`:${stripped}`) ||
      c.id.toLowerCase().replace(/[^a-z0-9]/g, '') === stripped.replace(/[^a-z0-9]/g, ''),
  );

  if (match) return match;

  const cleanSlug = stripped || lower || 'connector';
  const displayName = cleanSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  return {
    id: raw || cleanSlug,
    slug: cleanSlug,
    name: displayName,
    description: `Universal AI Connector for ${displayName}. Seamlessly connect tools, triggers, and live data feeds.`,
    provider: 'composio',
    category: 'productivity & project management',
    categories: ['productivity & project management'],
    icon: `https://logos.composio.dev/api/${cleanSlug}`,
    kind: 'composio',
    popularity: 50,
    rank: 1,
    isNoAuth: false,
    variants: [
      { id: `${cleanSlug}-oauth`, kind: 'composio', name: 'Composio OAuth', oneClick: true },
      { id: `${cleanSlug}-direct`, kind: 'mcp', name: 'Direct MCP', oneClick: true },
    ],
  };
}

function buildDiscoverConnectorDetail(item: ConnectorItem, installedSlugs: Set<string>) {
  const isMcp = item.kind === 'mcp' || item.provider === 'mcp';
  const isKortix = item.kind === 'kortix' || item.provider === 'kortix';
  const isComposio = item.kind === 'composio' || item.provider === 'composio' || (!isMcp && !isKortix);
  const mcpUrl = item.directMcpUrl || `https://mcp.run/${item.slug}`;

  const composioToolkit = {
    slug: item.slug,
    name: item.name,
    logo: item.icon,
    description: item.description,
    categories: item.categories || [item.category],
    isNoAuth: item.isNoAuth ?? false,
    connected: installedSlugs.has(item.slug),
    directId: item.id,
    directMcpUrl: item.directMcpUrl || null,
  };

  const discoverItem = {
    id: item.id || `composio:${item.slug}`,
    kind: (isMcp ? 'mcp' : isKortix ? 'kortix' : 'composio') as any,
    slug: item.slug,
    name: item.name,
    description: item.description,
    url: item.domain ? `https://${item.domain}` : null,
    icon: item.icon,
    domain: item.domain || '',
    categories: item.categories || [item.category],
    feeds: [item.kind || item.provider || 'composio'],
    popularity: item.popularity || 10,
    oneClick: true,
    mcpUrl: isMcp ? mcpUrl : undefined,
    composio: isComposio ? composioToolkit : undefined,
    installed: installedSlugs.has(item.slug) ? [item.slug] : [],
  };

  const variants: any[] = [];

  if (isComposio) {
    variants.push({
      id: `${item.slug}-composio`,
      kind: 'composio',
      name: `${item.name} Composio OAuth`,
      url: null,
      docs: null,
      description: item.description,
      transports: ['http'],
      requiresAuth: !item.isNoAuth,
      command: null,
      connector: null,
      oneClick: true,
      recommended: true,
      composio: composioToolkit,
      installed: installedSlugs.has(item.slug) ? [item.slug] : [],
    });
  }

  if (isMcp || item.directMcpUrl) {
    variants.push({
      id: `${item.slug}-mcp`,
      kind: 'mcp',
      name: `${item.name} MCP`,
      url: mcpUrl,
      docs: null,
      description: item.description,
      transports: ['http', 'sse'],
      requiresAuth: !item.isNoAuth,
      command: null,
      oneClick: true,
      recommended: !isComposio,
      connector: {
        provider: 'mcp',
        url: mcpUrl,
        transport: 'sse',
        auth: item.isNoAuth
          ? { type: 'none', in: 'header', name: null, prefix: null }
          : { type: 'bearer', in: 'header', name: 'Authorization', prefix: 'Bearer' },
      },
      installed: installedSlugs.has(item.slug) ? [item.slug] : [],
    });
  }

  if (isKortix) {
    variants.push({
      id: `${item.slug}-kortix`,
      kind: 'kortix',
      name: `${item.name} Native`,
      url: item.domain ? `https://${item.domain}` : null,
      docs: null,
      description: item.description,
      transports: ['http'],
      requiresAuth: false,
      command: null,
      connector: null,
      oneClick: true,
      recommended: true,
      kortix: { app: item.slug },
      installed: installedSlugs.has(item.slug) ? [item.slug] : [],
    });
  }

  if (variants.length === 0) {
    variants.push({
      id: `${item.slug}-default`,
      kind: 'composio',
      name: item.name,
      url: null,
      docs: null,
      description: item.description,
      transports: ['http'],
      requiresAuth: false,
      command: null,
      connector: null,
      oneClick: true,
      recommended: true,
      composio: composioToolkit,
      installed: installedSlugs.has(item.slug) ? [item.slug] : [],
    });
  }

  let foundRecommended = false;
  for (const v of variants) {
    if (v.recommended && !foundRecommended) {
      foundRecommended = true;
    } else if (v.recommended && foundRecommended) {
      v.recommended = false;
    }
  }
  if (!foundRecommended && variants.length > 0) {
    variants[0].recommended = true;
  }

  return {
    item: discoverItem,
    variants,
    installed: discoverItem.installed,
  };
}

function buildDiscoverConnectorTools(item: ConnectorItem, wayId?: string) {
  const isMcp = item.kind === 'mcp' || item.provider === 'mcp';
  const tools = [
    { name: `${item.slug}_get_status`, description: `Check connection and live health status for ${item.name}` },
    { name: `${item.slug}_query`, description: `Query and retrieve records from ${item.name}` },
    { name: `${item.slug}_execute`, description: `Execute operations, commands, or automations with ${item.name}` },
  ];
  return {
    way: {
      id: wayId || `${item.slug}-way`,
      kind: (isMcp ? 'mcp' : 'composio') as any,
      name: item.name,
    },
    tools,
    total: tools.length,
    source: (isMcp ? 'mcp' : 'composio') as any,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('mode') || 'discover';
  const q = (url.searchParams.get('q') || '').toLowerCase().trim();
  const category = (url.searchParams.get('category') || '').toLowerCase().trim();
  const rawKind = (url.searchParams.get('kind') || '').toLowerCase().trim();
  const kinds = rawKind ? rawKind.split(',').map((k) => k.trim()).filter(Boolean) : [];
  const oneClick = url.searchParams.get('oneClick') === '1' || url.searchParams.get('oneClick') === 'true';
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '48', 10), 1), 200);
  const cursor = parseInt(url.searchParams.get('cursor') || '0', 10);
  const slug = (url.searchParams.get('slug') || '').toLowerCase().trim();
  const id = (url.searchParams.get('id') || '').trim();
  const way = (url.searchParams.get('way') || '').trim();

  const catalog = getCatalog();
  const installedSlugs = getInstalledSlugs();

  // Mode: discover-detail (Explicit Discover connector detail with item + variants)
  if (mode === 'discover-detail' || (id && mode === 'discover')) {
    const item = findCatalogItem(id || slug, catalog);
    return NextResponse.json(buildDiscoverConnectorDetail(item, installedSlugs));
  }

  // Mode: discover-tools
  if (mode === 'discover-tools' && (id || slug)) {
    const item = findCatalogItem(id || slug, catalog);
    return NextResponse.json(buildDiscoverConnectorTools(item, way));
  }

  // Mode: detail (Returns AdminConnector format for connector-page)
  if (mode === 'detail' && (slug || id)) {
    const targetSlug = (slug || id || '').toLowerCase();
    const cleanSlug = targetSlug
      .replace(/^(composio|kortix|mcp|trading|openapi):/, '')
      .replace(/_mcp$/i, '')
      .replace(/-[a-z0-9]{4,}$/i, '');
    const item = catalog.find((c) => c.slug.toLowerCase() === targetSlug || c.slug.toLowerCase() === cleanSlug || c.id.toLowerCase() === targetSlug) || findCatalogItem(targetSlug, catalog);
    const displayName = item.name || cleanSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    return NextResponse.json({
      slug: slug || cleanSlug,
      name: displayName,
      provider: item.provider || 'composio',
      status: installedSlugs.has(cleanSlug) || installedSlugs.has(targetSlug) ? 'active' : 'needs_auth',
      connected: installedSlugs.has(cleanSlug) || installedSlugs.has(targetSlug),
      credentialMode: 'shared',
      authorizationStrategy: 'project',
      iconUrl: item.icon || `https://logos.composio.dev/api/${cleanSlug}`,
      actions: [
        { path: `${cleanSlug}_read`, name: `${cleanSlug}_read`, description: `Query and read records from ${displayName}`, risk: 'read', inputSchema: null },
        { path: `${cleanSlug}_write`, name: `${cleanSlug}_write`, description: `Execute operations and updates on ${displayName}`, risk: 'write', inputSchema: null },
      ],
    });
  }

  // Mode: installed
  if (mode === 'installed') {
    const validInstalled = Array.from(installedSlugs).filter((s) => typeof s === 'string' && s && !s.startsWith('conn_'));
    const installedList = validInstalled.map((s) => {
      const clean = s
        .replace(/^(composio|kortix|mcp|trading|openapi):/, '')
        .replace(/_mcp$/i, '')
        .replace(/-[a-z0-9]{4,}$/i, '');
      const match = catalog.find((c) => c.slug === s || c.slug === clean || c.id === s);
      const cleanName = clean.replace(/[-_]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      return {
        slug: s,
        name: match?.name || cleanName,
        description: match?.description || `Integrated connection for ${cleanName}`,
        provider: match?.provider || 'composio',
        iconUrl: match?.icon || `https://logos.composio.dev/api/${clean}`,
        status: 'active' as const,
        credentialMode: 'shared' as const,
        authorizationStrategy: 'project' as const,
        actions: [
          { path: `${clean}_read`, name: `${clean}_read`, description: `Read data from ${match?.name || cleanName}`, risk: 'read', inputSchema: null },
          { path: `${clean}_write`, name: `${clean}_write`, description: `Execute operations on ${match?.name || cleanName}`, risk: 'write', inputSchema: null },
        ],
      };
    });

    return NextResponse.json({
      connectors: installedList,
      total: installedList.length,
    });
  }

  // Mode: connections
  if (mode === 'connections') {
    const validInstalled = Array.from(installedSlugs).filter((s) => typeof s === 'string' && s && !s.startsWith('conn_'));
    const connections = validInstalled.map((s, idx) => {
      const clean = s
        .replace(/^(composio|kortix|mcp|trading|openapi):/, '')
        .replace(/_mcp$/i, '')
        .replace(/-[a-z0-9]{4,}$/i, '');
      const match = catalog.find((c) => c.slug === s || c.slug === clean || c.id === s);
      const cleanName = clean.replace(/[-_]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      return {
        connection_id: `conn_${s}_${idx + 1}`,
        connector_alias: s,
        connector_slug: s,
        label: `${cleanName} Connection`,
        name: match?.name || cleanName,
        provider: match?.provider || 'composio',
        owner_type: 'project',
        status: 'active',
        created_at: new Date(Date.now() - idx * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
    return NextResponse.json({ connections, total: connections.length });
  }

  // Mode: sections (Browse sections for Connectors directory)
  if (mode === 'sections') {
    let sourceCatalog = catalog;
    if (kinds.length > 0) {
      sourceCatalog = sourceCatalog.filter((item) =>
        kinds.some((k) => item.kind.toLowerCase() === k || item.provider.toLowerCase() === k)
      );
    }
    if (category) {
      sourceCatalog = sourceCatalog.filter(
        (item) =>
          item.category.toLowerCase() === category ||
          item.categories.some((c) => c.toLowerCase() === category)
      );
    }

    // Categorize
    const categoryMap = new Map<string, ConnectorItem[]>();
    for (const item of sourceCatalog) {
      const cat = item.category || 'other';
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat)!.push(item);
    }

    const categories = Array.from(categoryMap.entries()).map(([key, items]) => ({
      key,
      label: key,
      count: items.length,
    })).sort((a, b) => b.count - a.count);

    const sections = categories.slice(0, 14).map((cat) => {
      const allInCat = categoryMap.get(cat.key) || [];
      return {
        key: cat.key,
        label: cat.label,
        total: allInCat.length,
        items: allInCat.slice(0, 6),
      };
    });

    const popular = sourceCatalog.slice(0, 18);

    return NextResponse.json({
      popular,
      sections,
      categories,
      total: sourceCatalog.length,
    });
  }

  // Filter items
  let filtered = catalog;

  if (kinds.length > 0) {
    filtered = filtered.filter((item) =>
      kinds.some((k) => item.kind.toLowerCase() === k || item.provider.toLowerCase() === k)
    );
  }

  if (category) {
    filtered = filtered.filter(
      (item) =>
        item.category.toLowerCase() === category ||
        item.categories.some((c) => c.toLowerCase() === category)
    );
  }

  if (q) {
    filtered = filtered
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.domain || '').toLowerCase().includes(q) ||
          item.categories.some((c) => c.toLowerCase().includes(q))
      )
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aExact = aName === q || a.slug.toLowerCase() === q;
        const bExact = bName === q || b.slug.toLowerCase() === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aName.startsWith(q) || a.slug.toLowerCase().startsWith(q);
        const bStarts = bName.startsWith(q) || b.slug.toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        const aHas = aName.includes(q);
        const bHas = bName.includes(q);
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;

        return (b.popularity || 0) - (a.popularity || 0);
      });
  }

  if (oneClick) {
    filtered = filtered.filter((item) => item.isNoAuth || item.variants?.some((v) => v.oneClick));
  }

  const total = filtered.length;
  const pagedItems = filtered.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < total ? String(cursor + limit) : null;
  const hasMore = nextCursor !== null;

  // Mode: toolkits (Composio native response contract)
  if (mode === 'toolkits') {
    const toolkitSource = (kinds.length === 0 || kinds.includes('composio')) && !q && !category ? COMPOSIO_ITEMS : filtered;
    const pagedToolkits = toolkitSource.slice(cursor, cursor + limit);
    const toolkits = pagedToolkits.map((item) => ({
      slug: item.slug,
      name: item.name,
      logo: item.icon,
      description: item.description,
      categories: item.categories,
      isNoAuth: item.isNoAuth ?? false,
      connected: installedSlugs.has(item.slug),
      directId: item.id,
      directMcpUrl: item.directMcpUrl || null,
    }));

    return NextResponse.json({
      provider: 'composio',
      toolkits,
      total: toolkitSource.length,
      nextCursor: cursor + limit < toolkitSource.length ? String(cursor + limit) : undefined,
      hasMore: cursor + limit < toolkitSource.length,
    });
  }

  // Mode: discover (Default)
  return NextResponse.json({
    items: pagedItems,
    total,
    hasMore,
    nextCursor,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawSlug = (body.slug || body.app || body.id || body.connector_alias || '').toLowerCase().trim();
    const cleanSlug = rawSlug
      .replace(/^(composio|kortix|mcp|trading|openapi):/, '')
      .replace(/^conn_/, '')
      .replace(/_mcp$/i, '')
      .replace(/_\d+$/, '')
      .replace(/-[a-z0-9]{4,}$/i, '') || 'gmail';

    const catalog = getCatalog();
    const match = catalog.find((c) => c.slug === cleanSlug || c.slug === rawSlug || c.id === body.id || c.id === rawSlug);
    const appName = body.name || match?.name || cleanSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const provider = body.provider || match?.provider || 'composio';
    const connectionId = body.connectionId || (rawSlug.startsWith('conn_') ? rawSlug : `conn_${cleanSlug || 'gen'}_${Date.now()}`);

    // Mode: connect (Generate real Composio OAuth authorization URL or Dhan login)
    if (body.mode === 'connect' || body.operation === 'connect') {
      let connectUrl: string;
      if (cleanSlug === 'dhan') {
        const returnUrl = `/projects/trading/admin/connectors/dhan/dhan?app=composio:dhan`;
        connectUrl = `/api/dhan/auth/start?returnTo=${encodeURIComponent(returnUrl)}`;
      } else {
        connectUrl = await getComposioOAuthLink(cleanSlug || rawSlug);
      }
      return NextResponse.json({
        ok: true,
        success: true,
        provider,
        app: cleanSlug,
        slug: rawSlug || cleanSlug,
        name: appName,
        status: 'needs_auth',
        connectionId,
        requestId: `req_${Date.now()}`,
        sessionId: `sess_${Date.now()}`,
        redirectUrl: connectUrl,
        connectUrl: connectUrl,
        connected: false,
      });
    }

    // Mode: finalize (Verify or complete authorization)
    if (body.mode === 'finalize' || body.operation === 'finalize') {
      const isComposioActive = await checkComposioActiveConnection(cleanSlug);
      if (isComposioActive && cleanSlug) {
        const set = getInstalledSlugs();
        set.add(cleanSlug);
        saveInstalled(set);
        return NextResponse.json({
          ok: true,
          connected: true,
          status: 'active',
          connectionId,
        });
      }
      return NextResponse.json({
        ok: true,
        connected: false,
        status: 'initiated',
        connectionId,
      });
    }

    if (rawSlug.startsWith('conn_')) {
      // Discard connection alias IDs from being treated as catalog connectors for install/create
      return NextResponse.json({ ok: true, success: true });
    }

    // Default Install / Create Connector (Draft profile created in project)
    const set = getInstalledSlugs();
    if (cleanSlug) set.add(cleanSlug);
    if (rawSlug) set.add(rawSlug);
    saveInstalled(set);

    let connectUrl: string;
    if (cleanSlug === 'dhan') {
      const returnUrl = `/projects/trading/admin/connectors/dhan/dhan?app=composio:dhan`;
      connectUrl = `/api/dhan/auth/start?returnTo=${encodeURIComponent(returnUrl)}`;
    } else {
      connectUrl = await getComposioOAuthLink(cleanSlug || rawSlug);
    }

    return NextResponse.json({
      ok: true,
      success: true,
      provider,
      app: cleanSlug,
      slug: rawSlug || cleanSlug,
      name: appName,
      status: 'needs_auth',
      connected: false,
      connectionId,
      requestId: `req_${Date.now()}`,
      sessionId: `sess_${Date.now()}`,
      redirectUrl: connectUrl,
      connectUrl: connectUrl,
      sync: { status: 'synced', errors: [] },
      way: {
        id: body.way || `${cleanSlug}-way`,
        kind: provider === 'mcp' ? 'mcp' : 'composio',
        name: appName,
        oneClick: true,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to connect' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = (url.searchParams.get('slug') || url.searchParams.get('id') || '').toLowerCase().trim();
    const cleanSlug = raw
      .replace(/^(composio|kortix|mcp|trading|openapi):/, '')
      .replace(/_mcp$/i, '')
      .replace(/-[a-z0-9]{4,}$/i, '');
    const set = getInstalledSlugs();
    if (cleanSlug) set.delete(cleanSlug);
    if (raw) set.delete(raw);
    saveInstalled(set);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to disconnect' }, { status: 500 });
  }
}
