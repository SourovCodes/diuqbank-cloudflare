import { NavLink, Outlet } from "react-router-dom";
import { cx } from "../lib/cx";

const navItems = [
  { to: "/submissions/manual", label: "Manual submissions" },
  { to: "/submissions/auto", label: "Auto (AI) submissions" },
  { to: "/profile", label: "Edit profile" },
];

export function DashboardLayout() {
  return (
    <div className="container mx-auto w-full flex-1 px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <aside className="lg:sticky lg:top-20">
          <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 lg:block dark:text-gray-500">
            Dashboard
          </p>
          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition",
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
