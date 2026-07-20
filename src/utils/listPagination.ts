export type ListPaginationItem =
  | number
  | "ellipsis-start"
  | "ellipsis-end";

export const getListPaginationItems = (
  page: number,
  totalPages: number
): ListPaginationItem[] => {
  const safeTotal = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotal);

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1);
  }

  if (safePage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", safeTotal];
  }

  if (safePage >= safeTotal - 3) {
    return [
      1,
      "ellipsis-start",
      safeTotal - 4,
      safeTotal - 3,
      safeTotal - 2,
      safeTotal - 1,
      safeTotal,
    ];
  }

  return [
    1,
    "ellipsis-start",
    safePage - 1,
    safePage,
    safePage + 1,
    "ellipsis-end",
    safeTotal,
  ];
};
