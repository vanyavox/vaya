import { Outlet, Link } from 'react-router-dom';
import { useTheme } from './ThemeContext';

export function AuthLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen theme-bg flex flex-col">
      <header className="p-4 sm:p-6 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-primary">
          Vaya
        </Link>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-btn theme-hover transition-colors"
          aria-label="Переключить тему"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
