// Semester names follow the "<Type> <YY>" convention (e.g. "Fall 23").
const TYPE_ORDER: Record<string, number> = {
  fall: 1,
  summer: 2,
  spring: 3,
  short: 4,
};

/** Extract the year from a semester name (e.g. "Fall 23" -> 23). */
const extractYear = (name: string): number => {
  const match = /(\d+)\s*$/.exec(name);
  return match ? Number(match[1]) : 0;
};

/** Rank the semester type (Fall < Summer < Spring < Short; unknown last). */
const extractTypeRank = (name: string): number => {
  const match = /^([A-Za-z]+)/.exec(name);
  return (match && TYPE_ORDER[match[1].toLowerCase()]) ?? 99;
};

/**
 * Sort semesters by year (latest first), then by type (Fall, Summer, Spring,
 * Short). Names that don't fit the convention sink to the end, alphabetically.
 */
export const sortSemesters = <T extends { name: string }>(rows: T[]): T[] =>
  [...rows].sort(
    (a, b) =>
      extractYear(b.name) - extractYear(a.name) ||
      extractTypeRank(a.name) - extractTypeRank(b.name) ||
      a.name.localeCompare(b.name),
  );
