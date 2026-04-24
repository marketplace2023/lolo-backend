// Utility helpers for consistent API responses
export const ok = <T>(data: T, meta?: Record<string, unknown>) =>
  ({ data, ...(meta ?? {}) }) as const;

export const paginate = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) => ({
  data,
  pagination: { total, page, limit, pages: Math.ceil(total / limit) },
});

export const buildPaginationParams = (query: Record<string, string>) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(500, Math.max(1, Number(query.limit) || 50));
  const offset = (page - 1) * limit;
  const search = query.search?.trim() || "";
  return { page, limit, offset, search };
};
