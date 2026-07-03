import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import { cx } from "../lib/cx";

type NavItem = { to: string; icon: string; text: string; end?: boolean };

const navSections: { label: string; links: NavItem[] }[] = [
  {
    label: "Overview",
    links: [{ to: "/admin", icon: "📊", text: "Dashboard", end: true }],
  },
  {
    label: "Review",
    links: [
      { to: "/admin/manual-submissions", icon: "✋", text: "Manual queue" },
      { to: "/admin/auto-submissions", icon: "🤖", text: "Auto queue" },
    ],
  },
  {
    label: "Content",
    links: [
      { to: "/admin/questions", icon: "❓", text: "Questions" },
      { to: "/admin/submissions", icon: "📄", text: "Submissions" },
    ],
  },
  {
    label: "Taxonomy",
    links: [
      { to: "/admin/departments", icon: "🏛️", text: "Departments" },
      { to: "/admin/courses", icon: "📚", text: "Courses" },
      { to: "/admin/semesters", icon: "🗓️", text: "Semesters" },
      { to: "/admin/exam-types", icon: "📝", text: "Exam types" },
    ],
  },
  {
    label: "People",
    links: [{ to: "/admin/users", icon: "👥", text: "Users" }],
  },
];

const allLinks = navSections.flatMap((s) => s.links);

function SidebarLink({ to, icon, text, end }: NavItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
          isActive
            ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        )
      }
    >
      <span className="text-base">{icon}</span>
      {text}
    </NavLink>
  );
}

export function AdminLayout() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto w-full flex-1 px-4 py-8">
      {/* Mobile horizontal nav */}
      <nav className="mb-6 flex gap-1 overflow-x-auto pb-1 lg:hidden">
        {allLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              cx(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition",
                isActive
                  ? "bg-blue-600 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
              )
            }
          >
            <span>{link.icon}</span>
            {link.text}
          </NavLink>
        ))}
      </nav>

      <div className="flex gap-6 lg:items-start">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col lg:sticky lg:top-20">
          <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Admin panel
            </p>
            {user && (
              <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                {user.name}
              </p>
            )}
            <Link
              to="/"
              className="mt-2 inline-flex text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              ← Back to site
            </Link>
          </div>

          <nav className="flex flex-col gap-4">
            {navSections.map((section) => (
              <div key={section.label}>
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  {section.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.links.map((link) => (
                    <SidebarLink key={link.to} {...link} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content area */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
