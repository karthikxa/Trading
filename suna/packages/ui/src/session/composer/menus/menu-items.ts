import type { Agent, Session } from '@kortix/sdk/react';
import { translateUiCatalogText } from '../../../i18n/ui-catalog/localize-ui-catalog';
import { REMAINING_UI_TRANSLATION_KEYS } from '../../../i18n/ui-catalog/remaining-ui-translation-keys.generated';
import type { UiTranslator } from '../../../i18n';

import type { MentionKind } from '../types';
import { composerSelectableAgents } from '../composer-agent-access';

export interface MenuRow {
  index: number;
  kind: MentionKind;
  label: string;
  value: string;
  description?: string;
}

export interface MentionSection {
  kind: MentionKind;
  heading: string;
  items: MenuRow[];
}

export function formatRelativeTime(timestamp: number, now: number): string {
  const minutes = Math.floor((now - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export interface BuildMentionSectionsInput {
  agents: Agent[];
  sessions: Session[];
  files: string[];
  query: string;
  currentSessionId: string | undefined;
  /** Injected so the test is deterministic. */
  now?: number;
  tI18nComplete?: UiTranslator;
}

const SESSION_LIMIT = 5;
const FILE_LIMIT = 20;

/**
 * A session also matches when the query hits a file path it changed
 * (`summary.diffs[].file`) — not just its title or id. This preserves a real
 * discovery path from the live implementation
 * (session-chat-input.tsx:669-684): typing `@auth.ts` surfaces past sessions
 * that touched `auth.ts` even when neither the title nor the id mentions it.
 */
function sessionMatchesQuery(session: Session, q: string): boolean {
  const title = (session.title || '').toLowerCase();
  if (title.includes(q)) return true;
  if (session.id.toLowerCase().includes(q)) return true;
  const diffs = session.summary?.diffs;
  if (Array.isArray(diffs)) {
    return diffs.some((d) => (d.file || '').toLowerCase().includes(q));
  }
  return false;
}

export function buildMentionSections({
  agents,
  sessions,
  files,
  query,
  currentSessionId,
  now = 0,
  tI18nComplete,
}: BuildMentionSectionsInput): MentionSection[] {
  const heading = (value: string) =>
    tI18nComplete
      ? translateUiCatalogText(value, tI18nComplete, REMAINING_UI_TRANSLATION_KEYS)
      : value;
  const q = query.toLowerCase();
  let index = 0;
  const sections: MentionSection[] = [];

  // One rule for every agent list: only selectable primary agents. Subagents
  // are dispatched by the Chief, never mentioned as a peer. The legacy `@all`
  // broadcast and the localStorage group roster are retired with the
  // `trading.agents` tables.
  const agentRows: MenuRow[] = [];
  for (const a of composerSelectableAgents(agents)) {
    if (!(a.name || '').toLowerCase().includes(q)) continue;
    const cleanLabel = (a.name || '').replace(/_/g, ' ');
    agentRows.push({ index: index++, kind: 'agent', label: cleanLabel, value: a.name || '' });
  }
  if (agentRows.length) sections.push({ kind: 'agent', heading: heading('Agents'), items: agentRows });

  const sessionRows: MenuRow[] = [];
  for (const s of sessions) {
    if (sessionRows.length >= SESSION_LIMIT) break;
    if (s.parentID || s.time.archived || s.id === currentSessionId) continue;
    if (!sessionMatchesQuery(s, q)) continue;
    const ago = formatRelativeTime(s.time.updated, now);
    const count = s.summary?.files;
    sessionRows.push({
      index: index++,
      kind: 'session',
      label: s.title || s.id,
      value: s.id,
      description: count ? `${ago} · ${count} file${count === 1 ? '' : 's'} changed` : ago,
    });
  }
  if (sessionRows.length)
    sections.push({ kind: 'session', heading: heading('Sessions'), items: sessionRows });

  const fileRows: MenuRow[] = files
    .filter((f) => q.length === 0 || f.toLowerCase().includes(q))
    .slice(0, FILE_LIMIT)
    .map((f) => ({ index: index++, kind: 'file' as const, label: f, value: f }));
  if (fileRows.length) sections.push({ kind: 'file', heading: heading('Files'), items: fileRows });

  return sections;
}
