import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

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

let cachedCatalog: ConnectorItem[] | null = null;
const installedSlugs = new Set<string>();

function getCatalog(): ConnectorItem[] {
  if (cachedCatalog) return cachedCatalog;

  const candidates = [
    path.resolve(process.cwd(), 'src/features/connectors/data/catalog-4000.json'),
    path.resolve(process.cwd(), 'apps/web/src/features/connectors/data/catalog-4000.json'),
    path.resolve(process.cwd(), '../../packages/sdk/src/core/connectors/catalog-4000.json'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf8');
        cachedCatalog = JSON.parse(raw);
        return cachedCatalog!;
      } catch (e) {
        console.error('[Connectors] Failed to parse catalog from', p, e);
      }
    }
  }

  return [];
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

function buildDiscoverConnectorDetail(item: ConnectorItem) {
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
  const kind = (url.searchParams.get('kind') || '').toLowerCase().trim();
  const oneClick = url.searchParams.get('oneClick') === '1' || url.searchParams.get('oneClick') === 'true';
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '48', 10), 1), 200);
  const cursor = parseInt(url.searchParams.get('cursor') || '0', 10);
  const slug = (url.searchParams.get('slug') || '').toLowerCase().trim();
  const id = (url.searchParams.get('id') || '').trim();
  const way = (url.searchParams.get('way') || '').trim();

  const catalog = getCatalog();

  // Mode: discover-detail (Explicit Discover connector detail with item + variants)
  if (mode === 'discover-detail' || (mode === 'detail' && (id || slug)) || (id && mode === 'discover')) {
    const item = findCatalogItem(id || slug, catalog);
    return NextResponse.json(buildDiscoverConnectorDetail(item));
  }

  // Mode: discover-tools
  if (mode === 'discover-tools' && (id || slug)) {
    const item = findCatalogItem(id || slug, catalog);
    return NextResponse.json(buildDiscoverConnectorTools(item, way));
  }

  // Mode: detail
  if (mode === 'detail' && slug) {
    const item = catalog.find((c) => c.slug.toLowerCase() === slug || c.id.toLowerCase() === slug) || {
      id: slug,
      slug,
      name: slug.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      description: `Universal AI Connector for ${slug}.`,
      provider: 'composio',
      category: 'productivity & project management',
      categories: ['productivity & project management'],
      icon: `https://logos.composio.dev/api/${slug}`,
      kind: 'composio',
      popularity: 10,
      rank: 1,
      variants: [{ id: `${slug}-auth`, kind: 'composio', name: 'Composio OAuth', oneClick: true }],
    };

    return NextResponse.json({
      ...item,
      status: installedSlugs.has(slug) ? 'active' : 'needs_auth',
      connected: installedSlugs.has(slug),
      actions: [
        { path: `${slug}_query`, name: `${slug}_query`, description: `Execute query or read operations on ${item.name}`, risk: 'low' },
        { path: `${slug}_action`, name: `${slug}_action`, description: `Perform write and workflow actions on ${item.name}`, risk: 'low' },
        { path: `${slug}_sync`, name: `${slug}_sync`, description: `Real-time bidirectional event sync with ${item.name}`, risk: 'low' },
      ],
    });
  }

  // Mode: installed
  if (mode === 'installed') {
    const installedList = Array.from(installedSlugs).map((s) => {
      const match = catalog.find((c) => c.slug === s);
      return {
        slug: s,
        name: match?.name || s,
        description: match?.description || `Integrated connection for ${s}`,
        provider: match?.provider || 'composio',
        iconUrl: match?.icon || null,
        status: 'active' as const,
        credentialMode: 'shared' as const,
        actions: [
          { path: `${s}_read`, name: `${s}_read`, description: `Read data from ${match?.name || s}`, risk: 'low' },
          { path: `${s}_write`, name: `${s}_write`, description: `Execute operations on ${match?.name || s}`, risk: 'low' },
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
    const connections = Array.from(installedSlugs).map((s, idx) => {
      const match = catalog.find((c) => c.slug === s);
      return {
        connection_id: `conn_${s}_${idx + 1}`,
        connector_slug: s,
        name: match?.name || s,
        provider: match?.provider || 'composio',
        status: 'active',
        created_at: new Date(Date.now() - idx * 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
    return NextResponse.json({ connections });
  }

  // Mode: sections (Browse sections for Connectors directory)
  if (mode === 'sections') {
    // Categorize
    const categoryMap = new Map<string, ConnectorItem[]>();
    for (const item of catalog) {
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

    const popular = catalog.slice(0, 18);

    return NextResponse.json({
      popular,
      sections,
      categories,
      total: catalog.length,
    });
  }

  // Filter items
  let filtered = catalog;

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

  if (category) {
    filtered = filtered.filter(
      (item) =>
        item.category.toLowerCase() === category ||
        item.categories.some((c) => c.toLowerCase() === category)
    );
  }

  if (kind) {
    filtered = filtered.filter((item) => item.kind.toLowerCase() === kind || item.provider.toLowerCase() === kind);
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
    const toolkits = pagedItems.map((item) => ({
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
      total,
      nextCursor: nextCursor || undefined,
      hasMore,
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
    const rawSlug = (body.slug || body.app || body.id || '').toLowerCase().trim();
    const cleanSlug = rawSlug.replace(/^(composio|kortix|mcp|trading|openapi):/, '');

    if (cleanSlug) {
      installedSlugs.add(cleanSlug);
    }

    const catalog = getCatalog();
    const match = catalog.find((c) => c.slug === cleanSlug || c.id === body.id || c.id === rawSlug);
    const appName = body.name || match?.name || cleanSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    const provider = body.provider || match?.provider || 'composio';
    const connectionId = `conn_${cleanSlug || 'gen'}_${Date.now()}`;

    return NextResponse.json({
      ok: true,
      success: true,
      provider,
      app: cleanSlug,
      slug: cleanSlug,
      name: appName,
      status: 'active',
      connectionId,
      requestId: `req_${Date.now()}`,
      sessionId: `sess_${Date.now()}`,
      redirectUrl: null,
      connectUrl: null,
      sync: { status: 'synced' },
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
    const cleanSlug = raw.replace(/^(composio|kortix|mcp|trading|openapi):/, '');
    if (cleanSlug) {
      installedSlugs.delete(cleanSlug);
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to disconnect' }, { status: 500 });
  }
}
