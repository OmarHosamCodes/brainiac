/** Prefer a project/client label that is not a duplicate of the task title. */
export function resolveTaskThreadProjectLabel(args: {
  title: string;
  projectName: string | null | undefined;
  clientName?: string | null;
}): string | null {
  const title = args.title.trim();
  const projectName = args.projectName?.trim() || null;
  const clientName = args.clientName?.trim() || null;

  const projectDistinct =
    projectName && projectName.toLowerCase() !== title.toLowerCase() ? projectName : null;

  if (projectDistinct && clientName) return `${projectDistinct} · ${clientName}`;
  if (projectDistinct) return projectDistinct;
  if (clientName) return clientName;
  return null;
}
