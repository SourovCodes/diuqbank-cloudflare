// Tiny classnames helper — joins truthy args. Covers `cx("a", cond && "b")`.
type ClassValue = string | false | null | undefined;

export const cx = (...classes: ClassValue[]): string =>
  classes.filter(Boolean).join(" ");
