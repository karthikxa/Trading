export function configEntitySourcePath(path?: string | null): string {
  if (!path || typeof path !== 'string') return '';
  return path.split('#', 1)[0] ?? path;
}
