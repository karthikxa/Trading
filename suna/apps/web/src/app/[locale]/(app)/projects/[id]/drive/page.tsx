'use client';

import { useParams } from 'next/navigation';
import { FilesView } from '@/features/drives/files-view';

/**
 * /projects/[id]/drive — the project's Drive.
 */
export default function ProjectDrivePage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="flex-1 min-h-0">
        <FilesView projectId={id} />
      </div>
    </div>
  );
}
