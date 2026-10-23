import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="min-h-screen theme-bg flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl theme-muted mb-8">Страница не найдена</p>
      <Link to="/" className="btn-primary">
        На главную
      </Link>
    </div>
  );
}
