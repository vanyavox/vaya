import { Link } from 'react-router-dom';
import { useTheme } from '../app/ThemeContext';

export function Landing() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-4">
        <div className="text-2xl font-bold text-primary">Vaya</div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-btn hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Переключить тему"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <Link to="/login" className="btn-secondary text-sm sm:text-base px-3 sm:px-4">
            Войти
          </Link>
          <Link to="/register" className="btn-primary text-sm sm:text-base px-3 sm:px-4">
            Начать
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto text-center py-12 sm:py-20 px-4">
        <h1 className="text-3xl sm:text-5xl font-bold mb-4 sm:mb-6">
          Пространство для <span className="text-primary">вас двоих</span>
        </h1>
        <p className="text-base sm:text-xl text-gray-500 dark:text-gray-400 mb-8 sm:mb-10 max-w-2xl mx-auto">
          Желания, планы и дела — всё в одном месте для вашей пары.
          Никаких разрозненных заметок и календарей.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <Link to="/register" className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 w-full sm:w-auto">
            Создать аккаунт
          </Link>
          <Link to="/login" className="btn-secondary text-base sm:text-lg px-6 sm:px-8 py-3 w-full sm:w-auto">
            Войти
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto py-10 sm:py-16 px-4">
        <div className="grid grid-cols-1 sm:md:grid-cols-3 gap-4 sm:gap-8">
          <div className="card text-center">
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🎁</div>
            <h3 className="text-lg font-semibold mb-2">Списки желаний</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              Личные и общие виш-листы. Партнёр может зарезервировать подарок-сюрприз.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📅</div>
            <h3 className="text-lg font-semibold mb-2">Общий календарь</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              Встречи, свидания и планы. Подписка на Apple Calendar из коробки.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">✅</div>
            <h3 className="text-lg font-semibold mb-2">Дела по дому</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
              Задачи с фильтрами по исполнителю и категории. Всё под контролем.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-700 py-6 sm:py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        © 2026 Vaya — пространство для пары
      </footer>
    </div>
  );
}
