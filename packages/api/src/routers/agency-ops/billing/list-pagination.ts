export type OptionalPageInput = {
  page?: number;
  pageSize?: number;
};

export type PaginatedItems<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export function paginateItems<T>(items: T[], input: OptionalPageInput): PaginatedItems<T> {
  const total = items.length;
  if (input.page === undefined) {
    return { items, page: 1, pageSize: total, total };
  }

  const page = Math.max(1, Math.trunc(input.page));
  const pageSize = Math.max(1, Math.trunc(input.pageSize ?? 50));
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    page,
    pageSize,
    total,
  };
}
