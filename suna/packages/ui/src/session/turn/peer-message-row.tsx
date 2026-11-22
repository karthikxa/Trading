'use client';

import type { PeerMessageKind, PeerMessagePromptInfo } from '@kortix/shared';
import { peerHandleLabel } from '@kortix/shared';
import {
  ArrowBendDownLeftIcon,
  CaretRightIcon,
  ChatTeardropTextIcon,
  CheckCircleIcon,
  PowerIcon,
  type Icon,
} from '@phosphor-icons/react';
import { useId, useState } from 'react';
import { useTranslations } from '../../i18n';
import { cn } from '../../lib/utils';
import { BotAvatar, type BotShape, type BotExpression } from '../../workspace/sidebar/bot-avatar';
import { useTradingAgents, type TradingAgentDef } from '../../workspace/sidebar/use-trading-agents';

/**
 * A message another Kortix session sent this one (`send_message`), as Claude
 * Code draws it: one dim line, "Message from @reviewer · Schema migration
 * finished", that opens in place to the full text. The header and the footer
 * the API wrapped around it (`peerMessagePromptText`) are for the agent, not
 * the reader, so neither renders. An idle notice, a shutdown request and a
 * shutdown answer get their own words.
 */

const KIND_ICON: Record<PeerMessageKind, Icon> = {
  message: ChatTeardropTextIcon,
  idle_notice: CheckCircleIcon,
  shutdown_request: PowerIcon,
  shutdown_response: ArrowBendDownLeftIcon,
};

const KIND_KEY: Record<PeerMessageKind, string> = {
  message: 'message',
  idle_notice: 'idleNotice',
  shutdown_request: 'shutdownRequest',
  shutdown_response: 'shutdownResponse',
};

/**
 * The preview after the sender: the summary, else the first line of the text. CSS cuts it with `…`.
 * An idle notice (`firePeerIdleNotices` in the API) previews its "Its last answer:" line; its
 * first line ("reviewer finished its turn and is idle.") repeats the headline, so it shows only
 * when it says something else (an error).
 */
export function peerMessagePreview(info: Pick<PeerMessagePromptInfo, 'summary' | 'text'> & { kind?: PeerMessageKind }): string {
  if (info.summary?.trim()) return info.summary.trim();
  const lines = info.text.split('\n').map((line) => line.trim()).filter(Boolean);
  if (info.kind === 'idle_notice') {
    const answer = lines.find((line) => line.startsWith('Its last answer:'));
    if (answer) return answer.slice('Its last answer:'.length).trim();
    return lines[0] && !/finished its turn and is idle\.?$/.test(lines[0]) ? lines[0] : '';
  }
  return lines[0] ?? '';
}

function getFallbackColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#10B981', '#E11D48', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899', '#06B6D4'];
  return colors[Math.abs(hash) % colors.length];
}

export function PeerMessageRow({ info, actions }: { info: PeerMessagePromptInfo; actions?: React.ReactNode }) {
  const t = useTranslations('multiAgent.peer');
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const preview = peerMessagePreview(info);

  let agents: TradingAgentDef[] = [];
  try {
    const res = useTradingAgents();
    agents = res?.agents || [];
  } catch {
    agents = [];
  }

  const cleanFrom = (info.from || '').toLowerCase().replace(/^@/, '').trim();
  const senderAgent = agents.find((a) => {
    return (
      a.id.toLowerCase() === cleanFrom ||
      a.name.toLowerCase() === cleanFrom ||
      a.id.toLowerCase().replace(/_/g, ' ') === cleanFrom ||
      a.name.toLowerCase().replace(/\s+/g, '_') === cleanFrom
    );
  });

  const senderName = senderAgent?.name || peerHandleLabel(info.from);
  const isAdmin = senderAgent?.isAdmin;
  const avatarShape = senderAgent?.shape || 'pebble';
  const avatarColor = senderAgent?.color || getFallbackColor(info.from || 'bot');
  const avatarExpression = senderAgent?.expression || 'attentive';

  // Check if this peer row represents a multi-bot exchange summary
  const multiMatch = (info.summary || info.text || '').match(/(\d+)\s+messages?\s+with\s+(.*?)\s+(?:and|&)\s+(.*)/i);
  let multiRender: React.ReactNode = null;
  if (multiMatch) {
    const count = multiMatch[1];
    const nameA = multiMatch[2].replace(/·\s*Admin/i, '').trim();
    const nameB = multiMatch[3].split('\n')[0].trim();
    const agentA = agents.find(a => a.name.toLowerCase() === nameA.toLowerCase() || a.id.toLowerCase() === nameA.toLowerCase());
    const agentB = agents.find(a => a.name.toLowerCase() === nameB.toLowerCase() || a.id.toLowerCase() === nameB.toLowerCase());
    multiRender = (
      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
        <span className="shrink-0">{count} messages with</span>
        <BotAvatar shape={agentA?.shape || 'pebble'} color={agentA?.color || '#10B981'} expression={agentA?.expression || 'attentive'} size={14} className="shrink-0 inline-flex align-middle" />
        <span className="shrink-0 font-medium text-foreground">{agentA?.name || nameA}{agentA?.isAdmin ? ' · Admin' : ''}</span>
        <span className="shrink-0 text-muted-foreground">and</span>
        <BotAvatar shape={agentB?.shape || 'pebble'} color={agentB?.color || '#EC4899'} expression={agentB?.expression || 'attentive'} size={14} className="shrink-0 inline-flex align-middle" />
        <span className="shrink-0 font-medium text-foreground">{agentB?.name || nameB}{agentB?.isAdmin ? ' · Admin' : ''}</span>
      </div>
    );
  }

  // Nothing more to read than the line says: the row is not a disclosure.
  const expandable = info.text.trim().length > 0 && info.text.trim() !== preview;
  const line = multiRender ? multiRender : (
    <div className="flex items-center gap-1.5 min-w-0 truncate">
      <span className="shrink-0 text-muted-foreground">Message from</span>
      <BotAvatar shape={avatarShape} color={avatarColor} expression={avatarExpression} size={14} className="shrink-0 inline-flex align-middle" />
      <span className="shrink-0 font-medium text-foreground">{senderName}{isAdmin ? ' · Admin' : ''}</span>
      {preview && (
        <>
          <span aria-hidden className="shrink-0 text-muted-foreground">
            ·
          </span>
          <span className="min-w-0 truncate text-muted-foreground" title={preview}>
            {preview}
          </span>
        </>
      )}
    </div>
  );
  return (
    <div
      data-testid="peer-message-turn"
      data-peer-kind={info.kind}
      data-peer-message-id={info.messageId}
      className="flex min-w-0 flex-col gap-1"
    >
      {expandable ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((value) => !value)}
          className="text-muted-foreground hover:text-foreground duration-fast flex w-full min-w-0 items-center gap-1.5 text-left text-xs transition-colors"
        >
          {line}
          <CaretRightIcon aria-hidden className={cn('size-3 shrink-0', open && 'rotate-90')} />
          <span className="sr-only">{open ? t('collapse') : t('expand')}</span>
        </button>
      ) : (
        <div className="text-muted-foreground flex w-full min-w-0 items-center gap-1.5 text-xs">{line}</div>
      )}
      {expandable && open && (
        <div
          id={bodyId}
          className="text-muted-foreground border-border ml-1.5 border-l pl-3 text-sm whitespace-pre-wrap wrap-break-word"
        >
          {info.text}
        </div>
      )}
      {actions}
    </div>
  );
}
