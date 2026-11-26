'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DriveRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const projectId =
      typeof window !== 'undefined'
        ? localStorage.getItem('last_project_id') || 'trading'
        : 'trading';
    router.replace(`/projects/${projectId}/drive`);
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
