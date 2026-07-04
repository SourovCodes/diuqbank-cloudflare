import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { cx } from "../lib/cx";
import type { Icon } from "./icons";

export type NavItem = { to: string; icon: Icon; text: string; end?: boolean };
export type NavSection = { label: string; links: NavItem[] };

function SidebarLink({ to, icon: LinkIcon, text, end }: NavItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition",
          isActive
            ? "bg-gray-100 font-medium text-gray-900 dark:bg-gray-800 dark:text-gray-50"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100"
        )
      }
    >
      {({ isActive }) => (
        <>
          <LinkIcon
            className={cx(
              "h-4 w-4 shrink-0 transition",
              isActive
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400"
            )}
            strokeWidth={1.75}
          />
          {text}
        </>
      )}
    </NavLink>
  );
}

/**
 * Two-column shell shared by the user dashboard and the admin panel:
 * sticky icon sidebar on desktop, horizontal pill nav on mobile.
 */
export function SidebarLayout({
  sections,
  header,
}: {
  sections: NavSection[];
  /** Rendered above the nav in the desktop sidebar (identity block). */
  header?: ReactNode;
}) {
  const allLinks = sections.flatMap((s) => s.links);

  return (
    <div className="container mx-auto w-full flex-1 px-4 py-8">
      {/* Mobile horizontal nav */}
      <nav className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
        {allLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              cx(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition",
                isActive
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-900"
              )
            }
          >
            <link.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {link.text}
          </NavLink>
        ))}
      </nav>

      <div className="flex gap-8 lg:items-start">
        {/* Desktop sidebar */}
        <aside className="hidden lg:sticky lg:top-24 lg:flex lg:w-60 lg:shrink-0 lg:flex-col">
          {header}
          <nav className="flex flex-col gap-5">
            {sections.map((section) => (
              <div key={section.label}>
                <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">
                  {section.label}
                </p>
                <div className="flex flex-col gap-px">
                  {section.links.map((link) => (
                    <SidebarLink key={link.to} {...link} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content area */}
        <main className="min-w-0 flex-1 lg:border-l lg:border-gray-200 lg:pl-8 dark:lg:border-gray-800">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
