'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogClose, DialogPopup, DialogTitle } from '@/components/ui/dialog';

export interface LightboxImage {
  url: string;
  title: string;
}

interface ChartLightboxProps {
  image: LightboxImage | null;
  onClose: () => void;
}

/**
 * Full-bleed Kortix-bordered chart preview dialog that scales to the image's
 * exact aspect ratio up to 96vw x 92vh with no redundant chrome or compression.
 */
export function ChartLightbox({ image, onClose }: ChartLightboxProps) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    setAspectRatio(null);
  }, [image?.url]);

  const handleImgRef = (el: HTMLImageElement | null) => {
    if (el && el.complete && el.naturalWidth > 0 && el.naturalHeight > 0) {
      const nextRatio = el.naturalWidth / el.naturalHeight;
      setAspectRatio((prev) => (prev === nextRatio ? prev : nextRatio));
    }
  };

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogPopup
        showCloseButton={false}
        className="flex items-center justify-center w-auto max-w-[96vw] sm:max-w-[96vw] max-h-[94vh] p-1 bg-white border border-zinc-200/90 rounded-2xl shadow-2xl gap-0 overflow-hidden"
      >
        <DialogTitle className="sr-only">
          {image?.title || 'Chart Preview'}
        </DialogTitle>
        <DialogClose
          aria-label="Close chart preview"
          className="absolute right-3 top-3 z-20 inline-flex items-center justify-center size-8 rounded-full bg-white/95 hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950 border border-zinc-200/90 shadow-md backdrop-blur-xs transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </DialogClose>
        {image && (
          <img
            ref={handleImgRef}
            src={image.url}
            alt={image.title}
            onLoad={(e) => {
              const { naturalWidth, naturalHeight } = e.currentTarget;
              if (naturalWidth > 0 && naturalHeight > 0) {
                setAspectRatio(naturalWidth / naturalHeight);
              }
            }}
            style={{
              width: aspectRatio
                ? `min(calc(96vw - 8px), calc((94vh - 8px) * ${aspectRatio}))`
                : 'calc(96vw - 8px)',
            }}
            className="block max-w-none h-auto max-h-[calc(94vh-8px)] object-contain rounded-xl bg-white select-none"
          />
        )}
      </DialogPopup>
    </Dialog>
  );
}
