import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../ui/Avatar'
import { Skeleton, SkeletonList } from '../ui/Skeleton'

type NavLinkItem = { to: string; icon: string; text: string; end?: boolean }

const navSections: { label: string; links: NavLinkItem[] }[] = [
  {
    label: 'Overview',
    links: [{ to: '/admin', icon: 'DB', text: 'Dashboard', end: true }],
  },
  {
    label: 'Content',
    links: [
      { to: '/admin/departments', icon: 'DP', text: 'Departments' },
      { to: '/admin/courses', icon: 'CR', text: 'Courses' },
      { to: '/admin/semesters', icon: 'SM', text: 'Semesters' },
      { to: '/admin/exam-types', icon: 'EX', text: 'Exam Types' },
      { to: '/admin/questions', icon: 'QU', text: 'Questions' },
      { to: '/admin/submissions', icon: 'SB', text: 'Submissions' },
    ],
  },
  {
    label: 'Moderation',
    links: [
      { to: '/admin/manual-submissions', icon: 'MR', text: 'Manual Submissions' },
      { to: '/admin/auto-submissions', icon: 'AI', text: 'Auto Submissions' },
    ],
  },
  {
    label: 'People',
    links: [{ to: '/admin/users', icon: 'US', text: 'Users' }],
  },
]

function SidebarLink({ to, icon, text, end }: NavLinkItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-950'
        }`
      }
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-500">
        {icon}
      </span>
      {text}
    </NavLink>
  )
}

export function AdminLayout() {
  const { user } = useAuth()
  const allLinks = navSections.flatMap(s => s.links)

  return (
    <div className="min-h-screen bg-gray-100 text-gray-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-gray-200 px-5 py-4">
            <NavLink to="/admin" end className="block text-sm font-bold tracking-tight text-gray-950">
              DIU Question Bank
            </NavLink>
            <p className="mt-1 text-xs font-medium uppercase text-gray-400">Admin Workspace</p>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
            {navSections.map(section => (
              <div key={section.label}>
                <p className="mb-1 px-3 text-xs font-semibold uppercase text-gray-400">
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

          {user && (
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
                <Avatar name={user.name} image={user.image} size={9} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-950">{user.name}</p>
                  <p className="truncate text-xs text-blue-600">Administrator</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-950 lg:hidden">Admin Workspace</p>
                <p className="hidden text-sm text-gray-500 lg:block">Manage question-bank content, submissions, and users.</p>
              </div>
              {user && (
                <div className="flex items-center gap-2 text-right">
                  <div className="hidden min-w-0 sm:block">
                    <p className="truncate text-sm font-semibold text-gray-950">{user.name}</p>
                    <p className="truncate text-xs text-gray-500">@{user.username}</p>
                  </div>
                  <Avatar name={user.name} image={user.image} size={8} />
                </div>
              )}
            </div>
            <nav className="flex gap-1 overflow-x-auto border-t border-gray-100 px-4 py-2 lg:hidden">
              {allLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                      isActive ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600'
                    }`
                  }
                >
                  <span>{link.icon}</span>
                  {link.text}
                </NavLink>
              ))}
            </nav>
          </header>

          <main className="px-4 py-5 lg:px-6">
          <Suspense
            fallback={
              <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <SkeletonList count={6} />
              </div>
            }
          >
            <Outlet />
          </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}
