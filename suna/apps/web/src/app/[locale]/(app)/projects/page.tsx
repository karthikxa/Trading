import { redirect } from 'next/navigation';

/**
 * `/projects` — direct dashboard for chatting, skipping manual project creation
 * and GitHub connections.
 */
export default async function ProjectsPage({ searchParams }: { searchParams?: Promise<{ selector?: string }> }) {
  const params = await searchParams;
  if (params?.selector) {
    const { ProjectSelector } = await import('@/features/workspace/project-selector/project-selector');
    return <ProjectSelector />;
  }
  redirect('/projects/b0000000-0000-0000-0000-000000000001');
}
