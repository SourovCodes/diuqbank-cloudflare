import { cx } from "../../lib/cx";

const styles = {
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
  green: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
};

export function Badge({ label, variant = "gray" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant] ?? styles.gray
      )}
    >
      {label}
    </span>
  );
}
