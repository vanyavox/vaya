import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/app', label: 'Дашборд', icon: '📊', end: true },
    { to: '/app/wishes', label: 'Желания', icon: '🎁', end: false },
    { to: '/app/calendar', label: 'Календарь', icon: '📅', end: false },
    { to: '/app/todos', label: 'Дела', icon: '✅', end: false },
  ];

  const secondaryNav = [
    { to: '/app/pairing', label: 'Связка', icon: '💜' },
    { to: '/app/settings/calendar-feed', label: 'Настройки', icon: '⚙️' },
    { to: '/app/profile', label: 'Профиль', icon: '👤' },
  ];

  const allNav = [...navItems, ...secondaryNav];

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-surface border-b border-border px-4 py-3 flex items-center justify-between">
        <NavLink to="/app" className="text-xl font-bold text-primary">
          Vaya
        </NavLink>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 -mr-2 rounded-btn hover:bg-gray-100"
          aria-label="Меню"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? (
              <path d="M6 6l12 12M6 18L18 6" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[52px] z-30 bg-black/20" onClick={() => setMobileMenuOpen(false)}>
          <div className="bg-surface border-b border-border p-2" onClick={(e) => e.stopPropagation()}>
            {secondaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-btn text-sm font-medium ${
                    isActive ? 'bg-primary text-white' : 'text-text hover:bg-gray-50'
                  }`
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-sm text-danger rounded-btn hover:bg-red-50"
            >
              Выйти
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 bg-surface border-r border-border flex-col flex-shrink-0">
        <div className="p-4">
          <NavLink to="/app" className="text-xl font-bold text-primary">
            Vaya
          </NavLink>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {allNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-btn text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-gray-50 hover:text-text'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-border">
          <NavLink
            to="/app/profile"
            className="flex items-center gap-3 p-2 rounded-btn hover:bg-gray-50 transition-colors"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                {user?.name?.[0] ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-text-secondary truncate">{user?.email}</div>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-danger rounded-btn hover:bg-red-50 transition-colors"
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 rounded-btn min-w-[56px] ${
                  isActive ? 'text-primary' : 'text-text-secondary'
                }`
              }
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
