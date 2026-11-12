import type { Metadata } from 'next';
import { getTranslations } from '@/i18n/get-translations';

import { MarketplaceExplore } from '@/features/marketplace/marketplace-explore';
import { PublicMarketplaceProvider } from '@/features/marketplace/marketplace-public-surface';
import { loadMarketplaceExploreData } from '@/lib/marketplace-public';
import { socialMetadata } from '@/lib/seo/metadata';
import { CANONICAL_ORIGIN } from '@kortix/ui/internal/lib/site-metadata';

// RootLayout calls `connection()` in non-Vercel builds, so every route under
// app/[locale] renders dynamically per request; match [company]/[...item]/page.tsx
// and opt out of build-time ISR prerendering.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('hardcodedUi.i18nComplete');
  const title = t.raw('text7eebc3924618');
  const description = t.raw('text5a7b24722fae');
  return {
    title,
    description,
    alternates: { canonical: `${CANONICAL_ORIGIN}/marketplace` },
    ...socialMetadata(title, description, `${CANONICAL_ORIGIN}/marketplace`),
  };
}

export default async function MarketplacePage() {
  const { itemsPage, marketplacesPage, projectItems } = await loadMarketplaceExploreData();

  return (
    <PublicMarketplaceProvider>
      <MarketplaceExplore
        items={itemsPage.items}
        marketplaces={marketplacesPage.marketplaces}
        projectItems={projectItems}
      />
    </PublicMarketplaceProvider>
  );
}
