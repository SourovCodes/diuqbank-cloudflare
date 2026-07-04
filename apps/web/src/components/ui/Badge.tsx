import { cx } from "../../lib/cx";

type BadgeVariant = "blue" | "gray" | "green" | "yellow" | "red";

const styles = {
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  gray: "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
  green: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300",
  yellow:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
} satisfies Record<BadgeVariant, string>;

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

export function Badge({ label, variant = "gray" }: BadgeProps) {
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
