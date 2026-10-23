import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-gray-500 dark:text-gray-400 mb-8">Страница не найдена</p>
      <Link to="/" className="btn-primary">
        На главную
      </Link>
    </div>
  );
}
