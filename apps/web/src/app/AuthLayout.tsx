import { Outlet, Link, useLocation } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6">
        <Link to="/" className="text-2xl font-bold text-primary">
          Vaya
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
