import { NavLink } from "react-router-dom";
import { cx } from "../../lib/cx";

const tabs = [
  { to: "/submissions/manual", label: "Manual" },
  { to: "/submissions/auto", label: "Auto (AI)" },
];

export function SubmissionTabs() {
  return (
    <nav className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cx(
              "flex-1 rounded-md px-3 py-1.5 text-center text-sm font-semibold transition",
              isActive
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-gray-100"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
