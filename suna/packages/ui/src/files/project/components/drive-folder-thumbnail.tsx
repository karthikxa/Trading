'use client';

import { cn } from '../../../lib/utils';
import { chalkColors } from '@kortix/shared';

import { useFileExplorerSource } from '../explorer-source';
import { useNearViewport } from './file-thumbnail';

/** Lines one page holds; five fit the page's height with room to breathe. */
const LINES_PER_PAGE = 5;
/** Items each line of the back page stands for, so 50+ fills it. */
const ITEMS_PER_BACK_LINE = 10;

/**
 * How full the folder looks: the front page fills first, one line per item up
 * to five, then the back page takes one line per ten more items, up to five.
 *
 *   0 → none · 1 → 1 front · 5 → 5 front · 10 → 5 + 1 · 21 → 5 + 2 · 50+ → 5 + 5
 */
export function folderLines(count: number): { front: number; back: number } {
  const n = Math.max(0, Math.floor(count));
  return {
    front: Math.min(n, LINES_PER_PAGE),
    back: Math.min(Math.ceil(Math.max(0, n - LINES_PER_PAGE) / ITEMS_PER_BACK_LINE), LINES_PER_PAGE),
  };
}

/**
 * Line widths, like ragged text. Each page has its own rhythm so the two
 * never read as one striped block.
 */
const WIDTHS = {
  back: ['w-[60%]', 'w-[75%]', 'w-1/2', 'w-[65%]', 'w-[40%]'],
  front: ['w-[70%]', 'w-1/2', 'w-[80%]', 'w-[60%]', 'w-[45%]'],
} as const;

const PAGE = {
  back: 'left-[24%] top-[18%] -rotate-[7deg]',
  front: 'left-[33%] top-[13%] rotate-[6deg]',
} as const;

/**
 * A folder in the grid: a neutral tile, two pages tilted out of a front
 * pocket, and the number of items on the pocket. The pages wear the folder's
 * chalk colour, picked from its name: one folder, one hue, the same on every
 * visit and for every member. The front page is the deeper tint, the back one
 * the lighter. Their lines show how full the folder is (`folderLines`).
 */
export function DriveFolderThumbnail({ path, className }: { path: string; className?: string }) {
  const [nearRef, near] = useNearViewport<HTMLDivElement>();
  return (
    <div
      ref={nearRef}
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-[#0C0C0E] text-white transition-all duration-200 hover:scale-[1.02] shadow-sm select-none cursor-pointer',
        className
      )}
      style={{
        boxShadow: '0px 0px 14px 4px rgba(30, 30, 36, 0.4) inset',
      }}
    >
      {/* The listing waits until the tile is near the viewport */}
      {near ? <FolderContents path={path} /> : <Folder3DVisual count={null} />}
    </div>
  );
}

function FolderContents({ path }: { path: string }) {
  const listing = useFileExplorerSource().useFileList(path);
  const count = listing.data?.length ?? null;
  const more = listing.hasNextPage || listing.truncated;
  return <Folder3DVisual count={count} more={more} />;
}

function Folder3DVisual({ count, more = false }: { count: number | null; more?: boolean }) {
  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
      {/* 1. Left paper (white document, nestled neatly in pocket, slides up on hover) */}
      <div
        className="absolute top-[24%] left-[18%] w-[36%] h-[66%] rounded-lg shadow-sm z-10 -rotate-6 transition-all duration-300 ease-out group-hover:-translate-y-3.5 group-hover:-rotate-8 bg-gradient-to-b from-white via-zinc-50 to-zinc-100 border border-black/10 overflow-hidden"
      >
        <MiniDocument />
      </div>

      {/* 2. Middle paper (white document, nestled neatly in pocket, slides up on hover) */}
      <div
        className="absolute top-[18%] left-[32%] w-[36%] h-[70%] rounded-lg shadow-md z-20 rotate-0 transition-all duration-300 ease-out group-hover:-translate-y-4 bg-gradient-to-b from-white via-zinc-50 to-zinc-100 border border-black/10 overflow-hidden"
      >
        <MiniDocument />
      </div>

      {/* 3. Right paper (white document, nestled neatly in pocket, slides up on hover) */}
      <div
        className="absolute top-[24%] left-[46%] w-[36%] h-[66%] rounded-lg shadow-sm z-10 rotate-6 transition-all duration-300 ease-out group-hover:-translate-y-3.5 group-hover:rotate-8 bg-gradient-to-b from-white via-zinc-50 to-zinc-100 border border-black/10 overflow-hidden"
      >
        <MiniDocument />
      </div>

      {/* Translucent Frosted Glass Front Pocket (Curved SVG tab from Folder With Files) */}
      <div className="absolute inset-x-0 bottom-0 z-30 h-[56%] pointer-events-none flex items-end">
        <svg
          className="w-full h-full overflow-visible"
          viewBox="0 0 235 121"
          fill="none"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <foreignObject x="-10" y="-10" width="255" height="141">
            <div
              style={{
                backdropFilter: 'blur(6px)',
                clipPath: 'url(#bgblur_thumb_clip)',
                height: '100%',
                width: '100%',
              }}
            />
          </foreignObject>
          <path
            d="M104.615 0.350494L33.1297 0.838776C32.7542 0.841362 32.3825 0.881463 32.032 0.918854C31.6754 0.956907 31.3392 0.992086 31.0057 0.992096H31.0047C30.6871 0.99235 30.3673 0.962051 30.0272 0.929596C29.6927 0.897686 29.3384 0.863802 28.9803 0.866119L13.2693 0.967682H13.2527L13.2352 0.969635C13.1239 0.981406 13.0121 0.986674 12.9002 0.986237H9.91388C8.33299 0.958599 6.76052 1.22345 5.27423 1.76651H5.27325C4.33579 2.11246 3.48761 2.66213 2.7879 3.37393L2.49689 3.68839L2.492 3.69424C1.62667 4.73882 1.00023 5.96217 0.656067 7.27725C0.653324 7.28773 0.654065 7.29886 0.652161 7.30948C0.3098 8.62705 0.257231 10.0048 0.499817 11.3446L12.2147 114.399L12.2156 114.411L12.2176 114.423C12.6046 116.568 13.7287 118.508 15.3934 119.902C17.058 121.297 19.1572 122.056 21.3231 122.049V122.05H215.379C217.76 122.02 220.064 121.192 221.926 119.698V119.697C223.657 118.384 224.857 116.485 225.305 114.35L225.307 114.339L235.914 53.3798L235.968 53.1093L235.97 53.0985L235.971 53.0888C236.134 51.8978 236.044 50.685 235.705 49.5321C235.307 48.1669 234.63 46.9005 233.717 45.8144L233.383 45.4296C232.58 44.5553 231.614 43.8449 230.539 43.3398C229.311 42.7628 227.971 42.4685 226.616 42.4774H146.746C144.063 42.4705 141.423 41.8004 139.056 40.5263C136.691 39.2522 134.671 37.4127 133.175 35.1689L113.548 5.05948L113.544 5.05362L113.539 5.04776C112.545 3.65165 111.238 2.51062 109.722 1.72061C108.266 0.886502 106.627 0.422235 104.952 0.365143V0.364166L104.633 0.350494H104.615Z"
            fill="url(#pocket_grad_thumb)"
            fillOpacity="0.45"
            stroke="url(#pocket_stroke_thumb)"
            strokeWidth="0.8"
          />
          <defs>
            <clipPath id="bgblur_thumb_clip">
              <path d="M104.615 0.350494L33.1297 0.838776C32.7542 0.841362 32.3825 0.881463 32.032 0.918854C31.6754 0.956907 31.3392 0.992086 31.0057 0.992096H31.0047C30.6871 0.99235 30.3673 0.962051 30.0272 0.929596C29.6927 0.897686 29.3384 0.863802 28.9803 0.866119L13.2693 0.967682H13.2527L13.2352 0.969635C13.1239 0.981406 13.0121 0.986674 12.9002 0.986237H9.91388C8.33299 0.958599 6.76052 1.22345 5.27423 1.76651H5.27325C4.33579 2.11246 3.48761 2.66213 2.7879 3.37393L2.49689 3.68839L2.492 3.69424C1.62667 4.73882 1.00023 5.96217 0.656067 7.27725C0.653324 7.28773 0.654065 7.29886 0.652161 7.30948C0.3098 8.62705 0.257231 10.0048 0.499817 11.3446L12.2147 114.399L12.2156 114.411L12.2176 114.423C12.6046 116.568 13.7287 118.508 15.3934 119.902C17.058 121.297 19.1572 122.056 21.3231 122.049V122.05H215.379C217.76 122.02 220.064 121.192 221.926 119.698V119.697C223.657 118.384 224.857 116.485 225.305 114.35L225.307 114.339L235.914 53.3798L235.968 53.1093L235.97 53.0985L235.971 53.0888C236.134 51.8978 236.044 50.685 235.705 49.5321C235.307 48.1669 234.63 46.9005 233.717 45.8144L233.383 45.4296C232.58 44.5553 231.614 43.8449 230.539 43.3398C229.311 42.7628 227.971 42.4685 226.616 42.4774H146.746C144.063 42.4705 141.423 41.8004 139.056 40.5263C136.691 39.2522 134.671 37.4127 133.175 35.1689L113.548 5.05948L113.544 5.05362L113.539 5.04776C112.545 3.65165 111.238 2.51062 109.722 1.72061C108.266 0.886502 106.627 0.422235 104.952 0.365143V0.364166L104.633 0.350494H104.615Z" />
            </clipPath>
            <linearGradient id="pocket_grad_thumb" x1="114" y1="0" x2="114" y2="122" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2D2535" />
              <stop offset="1" stopColor="#1E1E22" />
            </linearGradient>
            <linearGradient id="pocket_stroke_thumb" x1="114" y1="0" x2="114" y2="122" gradientUnits="userSpaceOnUse">
              <stop stopColor="#666677" stopOpacity="0.4" />
              <stop offset="1" stopColor="#222226" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Item count in bottom left */}
      {count !== null && (
        <span className="text-white absolute bottom-2.5 left-3 text-sm leading-none font-bold tabular-nums z-40 drop-shadow-md">
          {count}
          {more ? '+' : ''}
        </span>
      )}
    </div>
  );
}

const MiniDocument = () => (
  <div className="w-full h-full p-1.5 flex flex-col gap-1 overflow-hidden select-none bg-white">
    <div className="w-full h-[2px] bg-zinc-300 rounded-full" />
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex gap-1">
        <div className="flex-1 h-[1.5px] bg-zinc-200 rounded-full" />
        <div className="flex-1 h-[1.5px] bg-zinc-200 rounded-full" />
      </div>
    ))}
  </div>
);

export function FolderPages({
  name,
  count,
  pocket = true,
}: {
  name: string;
  count: number | null;
  /** The solid front pocket the pages sit in. Off: just the two pages. */
  pocket?: boolean;
}) {
  return <Folder3DVisual count={count} />;
}
