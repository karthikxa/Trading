'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ConnectorsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const projectId =
      typeof window !== 'undefined'
        ? localStorage.getItem('last_project_id') || 'b0000000-0000-0000-0000-000000000001'
        : 'b0000000-0000-0000-0000-000000000001';
    router.replace(`/projects/${projectId}/admin/connectors`);
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
