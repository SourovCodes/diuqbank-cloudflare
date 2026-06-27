import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../ui/Avatar'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'text-blue-700 font-semibold' : 'text-gray-600 hover:text-gray-900'
}

function MobileNavLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `block rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`
      }
    >
      {children}
    </NavLink>
  )
}

function SubmitDropdown({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="text-sm font-medium text-gray-600 hover:text-gray-900">
        Submit ▾
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 rounded-lg border border-gray-200 bg-white shadow-lg">
          <Link to="/submit/manual" onClick={() => { setOpen(false); onClose?.() }} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            ✋ Manual Submission
          </Link>
          <Link to="/submit/auto" onClick={() => { setOpen(false); onClose?.() }} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
            🤖 Auto Submission
          </Link>
        </div>
      )}
    </div>
  )
}

function UserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 rounded-full focus:outline-none">
        <Avatar name={user.name} image={user.image} size={8} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-52 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <p className="truncate text-xs font-semibold text-gray-900">{user.name}</p>
            <p className="truncate text-xs text-gray-500">@{user.username}</p>
          </div>
          <Link to="/profile/edit" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">Edit Profile</Link>
          {user.role === 'admin' && (
            <Link to="/admin" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50">🛠 Admin Panel</Link>
          )}
          <div className="border-t border-gray-100" />
          <Link to="/my/manual-submissions" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">My Manual Submissions</Link>
          <Link to="/my/auto-submissions" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">My Auto Submissions</Link>
          <div className="border-t border-gray-100" />
          <button onClick={() => { logout(); setOpen(false); navigate('/') }} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

function MobileMenu({ onClose }: { onClose: () => void }) {
  const { isAuthenticated, user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 flex w-72 flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <Link to="/" onClick={onClose} className="flex items-center gap-2 font-bold text-blue-700">
            <span className="text-xl">📚</span> DIU Question Bank
          </Link>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" aria-label="Close menu">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <MobileNavLink to="/" onClick={onClose}>Home</MobileNavLink>
          <MobileNavLink to="/questions" onClick={onClose}>Questions</MobileNavLink>
          <MobileNavLink to="/contributors" onClick={onClose}>Contributors</MobileNavLink>

          {isAuthenticated && (
            <>
              <div className="my-2 border-t border-gray-200 pt-2">
                <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Submit</p>
                <MobileNavLink to="/submit/manual" onClick={onClose}>✋ Manual Submission</MobileNavLink>
                <MobileNavLink to="/submit/auto" onClick={onClose}>🤖 Auto Submission</MobileNavLink>
              </div>

              <div className="my-2 border-t border-gray-200 pt-2">
                {user && (
                  <div className="mb-2 flex items-center gap-3 px-3 py-2">
                    <Avatar name={user.name} image={user.image} size={8} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="truncate text-xs text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                )}
                <MobileNavLink to="/profile/edit" onClick={onClose}>Edit Profile</MobileNavLink>
                {user?.role === 'admin' && (
                  <MobileNavLink to="/admin" onClick={onClose}>🛠 Admin Panel</MobileNavLink>
                )}
                <MobileNavLink to="/my/manual-submissions" onClick={onClose}>My Manual Submissions</MobileNavLink>
                <MobileNavLink to="/my/auto-submissions" onClick={onClose}>My Auto Submissions</MobileNavLink>
              </div>

              <div className="border-t border-gray-200 pt-2">
                <button
                  onClick={() => { logout(); navigate('/'); onClose() }}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}

          {!isAuthenticated && (
            <div className="border-t border-gray-200 pt-2">
              <MobileNavLink to="/auth" onClick={onClose}>Sign In</MobileNavLink>
            </div>
          )}
        </nav>
      </div>
    </div>
  )
}

export function Navbar() {
  const { isAuthenticated } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-blue-700">
            <span className="text-2xl">📚</span>
            <span className="hidden sm:inline">DIU Question Bank</span>
            <span className="sm:hidden">DIU QB</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <NavLink to="/" end className={navLinkClass}>Home</NavLink>
            <NavLink to="/questions" className={navLinkClass}>Questions</NavLink>
            <NavLink to="/contributors" className={navLinkClass}>Contributors</NavLink>

            {isAuthenticated ? (
              <>
                <SubmitDropdown />
                <UserMenu />
              </>
            ) : (
              <Link to="/auth" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition">
                Sign In
              </Link>
            )}
          </nav>

          {/* Mobile: right side */}
          <div className="flex items-center gap-3 md:hidden">
            {isAuthenticated && <UserMenu />}
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Open menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && <MobileMenu onClose={() => setMobileOpen(false)} />}
    </>
  )
}
