// Tiny classnames helper — joins truthy args. Covers `cx("a", cond && "b")`.
export const cx = (...classes) => classes.filter(Boolean).join(" ");
