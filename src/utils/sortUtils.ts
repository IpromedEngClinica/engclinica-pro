export type SortDirection = "asc" | "desc";

export const normalizeSortValue = (value: unknown) => {
  if (value === null || value === undefined) return "";

  if (typeof value === "number") return value;

  if (value instanceof Date) return value.getTime();

  const stringValue = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    const date = new Date(stringValue);
    if (!Number.isNaN(date.getTime())) return date.getTime();
  }

  return stringValue.toLocaleLowerCase("pt-BR");
};

export const sortByValue = <T>(
  items: T[],
  getter: (item: T) => unknown,
  direction: SortDirection
) =>
  [...items].sort((a, b) => {
    const aValue = normalizeSortValue(getter(a));
    const bValue = normalizeSortValue(getter(b));

    if (aValue < bValue) return direction === "asc" ? -1 : 1;
    if (aValue > bValue) return direction === "asc" ? 1 : -1;
    return 0;
  });
