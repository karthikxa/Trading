'use client';

import type { ReactNode } from 'react';

import { UiLink as Link } from '../../providers/ui-provider';
import { AgentMarkGlyph, agentMarkVars } from '../../internal/components/agent-mark';
import { cn } from '../../internal/lib/utils';
import { BotAvatar } from '../../workspace/sidebar/bot-avatar';
import { INITIAL_TAURIC_AGENTS } from '../../workspace/sidebar/trading-agents-nav';

/**
 * An Agents-page card led by the agent's Grok-style animated avatar.
 */
export function AgentCoverCard({
  slug,
  href,
  onIntent,
  title,
  description,
  badges,
  meta,
  coverLabel,
  action,
}: {
  slug: string;
  href: string;
  onIntent?: () => void;
  title: ReactNode;
  description?: string | null;
  badges?: ReactNode;
  meta?: ReactNode;
  /** A short pill on the cover's top-left corner — "Default". */
  coverLabel?: string;
  /** A control on the cover's top-right corner (the pin). A sibling of the
   *  card's link, never inside it: a button may not sit in a link. */
  action?: ReactNode;
}) {
  const titleStr = typeof title === 'string' ? title : '';
  const matchingBot = INITIAL_TAURIC_AGENTS.find(
    (b) =>
      b.id === slug ||
      (slug === 'neutral_risk' && (b.id === 'trader_agent' || b.name === 'Invoice Collector')) ||
      b.id.replace(/_/g, '-') === slug.replace(/_/g, '-') ||
      b.id.replace(/-/g, '_') === slug.replace(/-/g, '_') ||
      (titleStr && b.name.toLowerCase() === titleStr.toLowerCase())
  );

  return (
    <div className="group/card relative flex">
      <Link
        href={href}
        prefetch
        onPointerEnter={onIntent}
        onFocus={onIntent}
        style={agentMarkVars(slug)}
        className={cn(
          'group bg-card flex-1 border-border/60 flex flex-col overflow-hidden rounded-md border text-left',
          'hover:border-border transition-[border-color] duration-(--duration-normal) ease-out',
          'focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none',
        )}
      >
        <span
          className="relative flex h-31 items-center justify-center overflow-hidden"
          style={{
            backgroundColor: matchingBot ? `${matchingBot.color}15` : 'var(--mark-tile)',
          }}
        >
          {matchingBot ? (
            <BotAvatar
              shape={matchingBot.shape}
              color={matchingBot.color}
              expression={matchingBot.expression}
              size={64}
              isAnimated={true}
            />
          ) : (
            <AgentMarkGlyph slug={slug} size={56} />
          )}
          {coverLabel ? (
            <span className="bg-background/80 border border-zinc-200/50 absolute top-2.5 left-2.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-zinc-900 shadow-2xs backdrop-blur-sm font-sans">
              {coverLabel}
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1 px-3.5 pt-3 pb-3.5 font-sans">
          <span className="flex items-center gap-1.5">
            <span className="text-foreground truncate text-sm font-medium font-sans leading-tight tracking-normal">{title}</span>
            {badges}
          </span>
          {description ? (
            <span className="text-muted-foreground line-clamp-2 text-xs text-pretty font-sans">
              {description}
            </span>
          ) : null}
          {meta ? (
            <span className="text-muted-foreground mt-auto flex flex-wrap items-center gap-x-2 gap-y-0.5 pt-1.5 text-xs">
              {meta}
            </span>
          ) : null}
        </span>
      </Link>
      {action ? <span className="absolute top-2 right-2">{action}</span> : null}
    </div>
  );
}
