export const normalizeSearchableText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.\-/]/g, "")
    .toLowerCase()
    .trim();

export const matchesSearchableFilter = (
  searchableText: string,
  query: string
) => {
  const normalizedQuery = normalizeSearchableText(query);
  if (!normalizedQuery) return true;

  const normalizedText = normalizeSearchableText(searchableText);
  if (normalizedText.includes(normalizedQuery)) return true;

  const terms = Array.from(
    new Set(normalizedQuery.split(/\s+/).filter(Boolean))
  );
  if (terms.length <= 1) return false;

  const meaningfulTerms = terms.filter((term) => term.length >= 3);
  if (!meaningfulTerms.length) return false;

  return meaningfulTerms.every((term) => normalizedText.includes(term));
};
