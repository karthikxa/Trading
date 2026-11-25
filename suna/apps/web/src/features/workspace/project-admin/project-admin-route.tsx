'use client';

import { Suspense, useEffect, type ReactNode } from 'react';

import { ConnectorsAppReturnBar } from '@kortix/ui/customize/connectors/connectors-app-return-bar';
import { CustomizeFrame } from '@kortix/ui/customize/shared/customize-tab-bar';
import {
  ProjectAdminDashboard,
  type ProjectAdminHostSections,
} from '@kortix/ui/workspace/admin/project-admin-dashboard';
import { forceDhanSync } from '@/features/markets/dhanLiveStore';
import { syncDhanOrders } from '@/features/trading/dhanOrdersSync';
import { syncDhanTradesToJournal } from '@/features/journal/dhanSync';

/* Project admin sections whose page lives in this app, not in `@kortix/ui`. */
const HOST_SECTIONS: ProjectAdminHostSections = {};

/**
 * Every `/projects/[id]/admin/**` route: Project admin on one section, and
 * optionally a page below it (a connector) in that section's pane.
 */
export function ProjectAdminRoute({
  projectId,
  section,
  content,
}: {
  projectId: string;
  section?: string;
  content?: ReactNode;
}) {
  useEffect(() => {
    // Handle redirect back from Dhan Consent App OAuth callback (?dhan=connected|error|missing_app_config)
    const params = new URLSearchParams(window.location.search);
    const dhanCallbackState = params.get('dhan');
    if (dhanCallbackState) {
      // Clean up the query param from the URL without a full reload
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);

      if (dhanCallbackState === 'connected') {
        window.dispatchEvent(new CustomEvent('dhan-token-updated'));
        forceDhanSync();
        syncDhanOrders(true).catch(() => {});
        syncDhanTradesToJournal(undefined, true).catch(() => {});
      }
      // No modal — Kortix native connector flow handles status via ConnectorsPage
    }
  }, []);

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      {/* The Customize bar over Project admin too: one row of tabs for both trees. */}
      <CustomizeFrame projectId={projectId}>
        <ProjectAdminDashboard projectId={projectId} section={section} content={content} hostSections={HOST_SECTIONS} />
      </CustomizeFrame>
      {section === 'connectors' ? (
        <Suspense fallback={null}>
          <ConnectorsAppReturnBar />
        </Suspense>
      ) : null}
    </div>
  );
}

/** A URL segment as typed; a malformed escape stays raw so the page can say it does not exist. */
export function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
