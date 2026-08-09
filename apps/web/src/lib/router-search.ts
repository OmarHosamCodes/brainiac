/**
 * Agency and auth routes use free-form query strings. Validate as a loose
 * record so TanStack Router accepts arbitrary search params.
 */
export function validateLooseSearch(search: Record<string, unknown>): Record<string, unknown> {
  return { ...search };
}
