'use client';

import { UsersThreeIcon } from '@phosphor-icons/react';
import { useTranslations } from '../../i18n';
import { PeerMessageRow } from './peer-message-row';
import type { NoticeBatchItem } from './subagent-notice';
import { SubagentNoticeRow } from './subagent-notice-row';
import { BotAvatar } from '../../workspace/sidebar/bot-avatar';
import { useTradingAgents, type TradingAgentDef } from '../../workspace/sidebar/use-trading-agents';

/**
 * Several notices the API coalesced into one delivered prompt
 * (`session-notice-batch.ts`): background subagents that ended, teammates that
 * went idle, sessions that answered a `notify_when_idle`. One header line ("3
 * agents finished") or peer dialog header ("2 messages with Receipt Tracker and Sheet Manager")
 * and one compact row each.
 */
export function NoticeBatchGroup({ items, actions }: { items: NoticeBatchItem[]; actions?: React.ReactNode }) {
  const t = useTranslations('multiAgent.notice');

  let agents: TradingAgentDef[] = [];
  try {
    const res = useTradingAgents();
    agents = res?.agents || [];
  } catch {
    agents = [];
  }

  const isAllPeer = items.length > 0 && items.every((it) => it.kind === 'peer_idle');
  let peerHeader: React.ReactNode = null;

  if (isAllPeer && agents.length > 0) {
    const froms = Array.from(new Set(items.map((it) => (it as { info: { from: string } }).info?.from).filter(Boolean)));
    const matchedAgents = froms.map((f) => {
      const clean = f.toLowerCase().replace(/^@/, '').trim();
      return agents.find((a) => a.id.toLowerCase() === clean || a.name.toLowerCase() === clean);
    }).filter(Boolean) as TradingAgentDef[];

    if (matchedAgents.length >= 2) {
      const a = matchedAgents[0];
      const b = matchedAgents[1];
      peerHeader = (
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span>{items.length} messages with</span>
          <BotAvatar shape={a.shape} color={a.color} expression={a.expression} size={14} className="shrink-0 inline-flex align-middle" />
          <span className="font-medium text-foreground">{a.name}{a.isAdmin ? ' · Admin' : ''}</span>
          <span>and</span>
          <BotAvatar shape={b.shape} color={b.color} expression={b.expression} size={14} className="shrink-0 inline-flex align-middle" />
          <span className="font-medium text-foreground">{b.name}{b.isAdmin ? ' · Admin' : ''}</span>
        </div>
      );
    } else if (matchedAgents.length === 1) {
      const a = matchedAgents[0];
      peerHeader = (
        <div className="flex items-center gap-1.5 min-w-0">
          <span>{items.length} messages with</span>
          <BotAvatar shape={a.shape} color={a.color} expression={a.expression} size={14} className="shrink-0 inline-flex align-middle" />
          <span className="font-medium text-foreground">{a.name}{a.isAdmin ? ' · Admin' : ''}</span>
        </div>
      );
    }
  }

  return (
    <div data-testid="notice-batch" data-notice-count={items.length} className="flex min-w-0 flex-col gap-1">
      <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
        {!peerHeader && <UsersThreeIcon aria-hidden className="size-3.5 shrink-0" />}
        {peerHeader ? peerHeader : <span>{t('batchTitle', { count: items.length })}</span>}
      </div>
      <ul className="border-border ml-1.5 flex min-w-0 flex-col gap-1 border-l pl-3">
        {items.map((item, index) => (
          <li key={item.kind === 'peer_idle' ? `peer-${item.info.messageId}` : `${item.notice.sessionId}-${index}`}>
            {item.kind === 'peer_idle' ? <PeerMessageRow info={item.info} /> : <SubagentNoticeRow notice={item.notice} />}
          </li>
        ))}
      </ul>
      {actions}
    </div>
  );
}
