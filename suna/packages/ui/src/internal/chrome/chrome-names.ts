import type { ChromeConnection } from '@kortix/sdk';

/**
 * Two browsers can share a default name ("Chromium on macOS"). Where they do,
 * the list tells them apart: the profile label when it has one, else a count
 * in connection order. The stored name never changes; this is display only.
 */
export function chromeDisplayNames(list?: readonly ChromeConnection[] | null): Map<string, string> {
  const safeList = Array.isArray(list) ? list : [];
  const byName = new Map<string, ChromeConnection[]>();
  for (const chrome of safeList) byName.set(chrome.name, [...(byName.get(chrome.name) ?? []), chrome]);
  const out = new Map<string, string>();
  for (const chrome of safeList) {
    const same = byName.get(chrome.name) ?? [];
    if (same.length < 2) {
      out.set(chrome.id, chrome.name);
    } else if (chrome.profileLabel && !chrome.name.includes(chrome.profileLabel)) {
      out.set(chrome.id, `${chrome.name} · ${chrome.profileLabel}`);
    } else {
      out.set(chrome.id, `${chrome.name} #${same.indexOf(chrome) + 1}`);
    }
  }
  return out;
}

/** "N browsers · M online" for the Apps modal. */
export function chromeCounts(list?: readonly ChromeConnection[] | null): { count: number; online: number } {
  const safeList = Array.isArray(list) ? list : [];
  return { count: safeList.length, online: safeList.filter((chrome) => chrome.online).length };
}

/** Offline for longer than `thresholdMs`: only then is "last seen" worth saying. */
export function offlineLongerThan(lastSeenAt: string | null, thresholdMs: number, now = Date.now()): boolean {
  if (!lastSeenAt) return false;
  const seen = Date.parse(lastSeenAt);
  return Number.isFinite(seen) && now - seen > thresholdMs;
}
