'use client';

import { useParams } from 'next/navigation';
import { ProjectFilesView } from '@kortix/ui/workspace';
import { SideFolder } from "@/components/ui/side-folder";

/**
 * /projects/[id]/files — the standalone Files page (Google-Drive-style browser
 * over the project repo).
 */
export default function ProjectFilesPage() {
  const { id: projectId } = useParams<{ id: string }>();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <ProjectFilesView projectId={projectId} />
    </div>
  );
}

export function SideFolderDemo() {
  return (
    <div className="flex items-center justify-center w-full h-full bg-white p-10 font-sans">
      <article className="w-full max-w-sm text-neutral-900">
        <SideFolder />
        <h3 className="mt-4 text-lg font-semibold">Card title</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Short description of the feature.
        </p>
      </article>
    </div>
  );
}
