import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { PasswordInput } from '../shared/PasswordInput';

// Registration is closed; keep the form code but block usage
const REGISTRATION_OPEN = false;

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!REGISTRATION_OPEN) return;
    setError('');
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/app');
    } catch (err: any) {
      setError(err.message ?? 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h1 className="text-2xl font-bold mb-6">Создать аккаунт</h1>

      {error && (
        <div className="mb-4 p-3 border-2 border-dashed border-danger rounded-btn text-danger text-sm">
          {error}
        </div>
      )}

      {!REGISTRATION_OPEN && (
        <div className="mb-4 p-3 rounded-btn bg-primary/10 text-primary text-sm">
          Регистрация временно закрыта. Для доступа обратитесь к владельцу пары.
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" aria-disabled={!REGISTRATION_OPEN}>
        <div>
          <label className="block text-sm font-medium mb-1">Имя</label>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Пароль</label>
          <PasswordInput
            value={password}
            onValueChange={setPassword}
            minLength={8}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Подтверждение пароля</label>
          <PasswordInput
            value={confirm}
            onValueChange={setConfirm}
            minLength={8}
            required
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading || !REGISTRATION_OPEN}>
          {!REGISTRATION_OPEN ? 'Регистрация закрыта' : loading ? 'Создание...' : 'Зарегистрироваться'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm theme-muted">
        Уже есть аккаунт?{' '}
        <Link to="/login" className="text-primary hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}
