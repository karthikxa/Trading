/**
 * Site metadata configuration - SIMPLE AND WORKING
 */

/**
 * One public origin for canonical URLs, sitemaps, structured data, and
 * machine-readable representations. Runtime app URLs are deliberately not
 * used here: a preview/dev hostname must never become the canonical origin.
 */
export const CANONICAL_ORIGIN = 'https://kortix.com';

export const siteMetadata = {
  name: 'Zed AI',
  title: 'Zed AI – Autonomous Trading & Multi-Agent Intelligence',
  description:
    'Zed AI: Autonomous Trading terminal with multi-agent intelligence, live markets, and portfolio management.',
  url: CANONICAL_ORIGIN,
  keywords:
    'Zed AI, Autonomous Trading, AI Trading terminal, multi-agent intelligence, trading agents, live markets, portfolio management, stock analysis, crypto trading, forex trading',
};
