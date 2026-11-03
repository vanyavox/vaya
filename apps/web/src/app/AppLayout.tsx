import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';

export function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const tabRowRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ left: number; width: number; height: number } | null>(null);

  // Pages scroll with the document (the layout keeps no scroller), so a new
  // page would otherwise open at the previous page's scroll offset.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Keep the glass pill glued to the active tab (and on resize/orientation).
  useLayoutEffect(() => {
    const measure = () => {
      const active = tabRowRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) {
        setPill(null);
        return;
      }
      setPill({
        left: active.offsetLeft,
        width: active.offsetWidth,
        height: active.offsetHeight,
      });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pathname]);

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
    { to: '/app/books', label: 'Библиотека', icon: '📚', end: false },
  ];

  const secondaryNav = [
    { to: '/app/pairing', label: 'Связка', icon: '💜', end: false },
    { to: '/app/profile', label: 'Профиль', icon: '👤', end: false },
    { to: '/app/settings', label: 'Настройки', icon: '⚙️', end: true },
  ];

  const allNav = [...navItems, ...secondaryNav];

  return (
    <div className="min-h-dvh theme-bg flex flex-col lg:flex-row">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 theme-surface border-b theme-border px-4 safe-top pb-3 flex items-center justify-between">
        <NavLink to="/app" className="text-xl font-bold text-primary">
          V&Y
        </NavLink>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="theme-toggle -mr-2"
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
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 top-[calc(4rem+env(safe-area-inset-top,0px))] z-50 overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="theme-surface border-b theme-border p-2" onClick={(e) => e.stopPropagation()}>
            {secondaryNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  isActive ? 'nav-item nav-item-active' : 'nav-item'
                }
              >
                <span>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-sm text-danger rounded-btn theme-hover"
            >
              Выйти
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 theme-surface border-r theme-border flex-col flex-shrink-0 overflow-hidden">
        <div className="p-4 shrink-0">
          <NavLink to="/app" className="text-xl font-bold text-primary">
            V&Y
          </NavLink>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto px-2 space-y-1">
          {allNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive ? 'nav-item nav-item-active' : 'nav-item'
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t theme-border shrink-0">
          <NavLink
            to="/app/profile"
            className="flex items-center gap-3 p-2 rounded-btn theme-hover transition-colors"
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
              <div className="text-xs theme-muted truncate">{user?.email}</div>
            </div>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-danger rounded-btn theme-hover"
          >
            Выйти
          </button>
          <button
            onClick={toggleTheme}
            className="theme-toggle w-full text-left px-3 py-2 text-sm theme-muted flex items-center gap-2"
          >
            {theme === 'dark' ? '☀️ Светлая тема' : '🌙 Тёмная тема'}
          </button>
        </div>
      </aside>

      {/* Main content: pb must cover the fixed mobile tab bar (h-16 + safe-bottom) */}
      <main className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-bar border-t theme-border safe-bottom safe-left safe-right">
        <div ref={tabRowRef} className="relative flex items-center justify-around h-16 px-2">
          {pill && (
            <div
              className="tab-pill"
              style={{ left: pill.left, width: pill.width, height: pill.height }}
              aria-hidden="true"
            />
          )}
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `tab-item relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-full min-w-[52px] transition-colors ${
                  isActive ? 'text-primary dark:text-primary-light' : 'theme-muted'
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
