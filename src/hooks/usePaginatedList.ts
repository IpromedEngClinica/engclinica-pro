import { useEffect, useMemo, useState } from "react";

export const usePaginatedList = <T,>(items: T[], pageSize: number) => {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [items, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize]
  );

  return {
    page,
    setPage,
    totalPages,
    paginatedItems,
    firstVisibleIndex: items.length ? (page - 1) * pageSize + 1 : 0,
    lastVisibleIndex: Math.min(page * pageSize, items.length),
    totalItems: items.length,
  };
};
