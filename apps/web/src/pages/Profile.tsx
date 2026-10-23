import { useState } from 'react';
import { useAuth } from '../app/AuthContext';
import { api } from '../shared/api-client';

export function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.patch('/users/me', { name, email });
      await refreshUser();
      setMessage('Сохранено!');
    } catch (err: any) {
      setMessage(err.message ?? 'Ошибка');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await api.upload('/users/me/avatar', file);
      await refreshUser();
    } catch (err: any) {
      setMessage(err.message ?? 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-8">Профиль</h1>

      <div className="max-w-lg">
        <div className="card">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-28 h-28 rounded-full object-cover"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-primary/20 flex items-center justify-center text-primary text-4xl font-bold">
                  {user?.name?.[0] ?? '?'}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer hover:bg-primary-dark">
                📷
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            {uploading && <p className="text-sm theme-muted mt-2">Загрузка...</p>}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Имя</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {message && (
              <div
                className={`p-2 rounded-btn text-sm ${
                  message === 'Сохранено!' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}
              >
                {message}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="card mt-6 border-danger/30">
          <h3 className="font-semibold mb-3">Выход из аккаунта</h3>
          <p className="theme-muted text-sm mb-3">
            Вы выйдете из аккаунта на этом устройстве
          </p>
          <button onClick={logout} className="btn-danger">
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  );
}
