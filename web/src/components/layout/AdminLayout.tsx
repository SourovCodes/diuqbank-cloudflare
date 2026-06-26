import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../ui/Avatar'

type NavLinkItem = { to: string; icon: string; text: string; end?: boolean }

const navSections: { label: string; links: NavLinkItem[] }[] = [
  {
    label: 'Overview',
    links: [{ to: '/admin', icon: '📊', text: 'Dashboard', end: true }],
  },
  {
    label: 'Content',
    links: [
      { to: '/admin/departments', icon: '🏛️', text: 'Departments' },
      { to: '/admin/courses', icon: '📚', text: 'Courses' },
      { to: '/admin/semesters', icon: '🗓️', text: 'Semesters' },
      { to: '/admin/exam-types', icon: '📝', text: 'Exam Types' },
      { to: '/admin/questions', icon: '❓', text: 'Questions' },
      { to: '/admin/submissions', icon: '📎', text: 'Submissions' },
    ],
  },
  {
    label: 'Moderation',
    links: [{ to: '/admin/manual-submissions', icon: '🛡️', text: 'Manual Submissions' }],
  },
  {
    label: 'People',
    links: [{ to: '/admin/users', icon: '👥', text: 'Users' }],
  },
]

function SidebarLink({ to, icon, text, end }: NavLinkItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      <span className="text-base">{icon}</span>
      {text}
    </NavLink>
  )
}

export function AdminLayout() {
  const { user } = useAuth()
  const allLinks = navSections.flatMap(s => s.links)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Mobile horizontal nav */}
      <nav className="mb-6 flex gap-1 overflow-x-auto pb-1 lg:hidden">
        {allLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition ${
                isActive ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
              }`
            }
          >
            <span>{link.icon}</span>
            {link.text}
          </NavLink>
        ))}
      </nav>

      <div className="flex gap-6 lg:items-start">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col">
          {user && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <Avatar name={user.name} image={user.image} size={10} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="truncate text-xs text-blue-600">Administrator</p>
              </div>
            </div>
          )}

          <nav className="flex flex-col gap-4">
            {navSections.map(section => (
              <div key={section.label}>
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {section.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.links.map(link => (
                    <SidebarLink key={link.to} {...link} />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
