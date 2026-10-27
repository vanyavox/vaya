import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../app/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../shared/api-client';
import { useToast } from '../app/ToastProvider';

export function Profile() {
  const { user: me, refreshUser, logout } = useAuth();
  const { userId } = useParams<{ userId?: string }>();
  const toast = useToast();
  const isSelf = !userId || userId === me?.id;

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => api.get<any>(`/users/${userId}`),
    enabled: !!userId && userId !== me?.id,
  });

  const user: any = isSelf ? me : member;
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setBio(user.bio ?? '');
    setEmail(user.email ?? '');
  }, [user?.name, user?.bio, user?.email]);

  if (userId && userId !== me?.id && memberLoading) {
    return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />;
  }
  if (userId && userId !== me?.id && !member) {
    return <p className="theme-muted">Профиль не найден</p>;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/users/me', { name, email, bio });
      await refreshUser();
      toast('Профиль сохранён');
    } catch (err: any) {
      toast(err.message ?? 'Не удалось сохранить профиль');
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
      toast('Аватар обновлён');
    } catch (err: any) {
      toast(err.message ?? 'Не удалось загрузить аватар');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">
          {isSelf ? 'Профиль' : `Профиль · ${user?.name ?? ''}`}
        </h1>
        {isSelf && (
          <Link to="/app/settings" className="btn-secondary text-sm">
            Настройки
          </Link>
        )}
      </div>

      {/* Anketa */}
      <div className="card max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <label className={`relative ${isSelf ? 'cursor-pointer' : ''}`}>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl text-primary font-bold">
                {user?.name?.[0] ?? '?'}
              </div>
            )}
            {isSelf && (
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            )}
            {isSelf && (
              <span className="absolute -bottom-1 -right-1 text-xs bg-primary text-white rounded-full px-2 py-0.5">
                {uploading ? '…' : '📷'}
              </span>
            )}
          </label>
          <div>
            <div className="text-lg font-semibold">{user?.name}</div>
            <div className="text-sm theme-muted">{user?.email}</div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Имя</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={!isSelf}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">О себе</label>
            <textarea
              className="input"
              rows={5}
              maxLength={500}
              placeholder="Что-нибудь о себе: интересы, увлечения, ожидания…"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              readOnly={!isSelf}
            />
            <div className="text-xs theme-muted mt-1 text-right">{bio.length}/500</div>
          </div>
          {isSelf && (
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
          )}
          {isSelf ? (
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить анкету'}
            </button>
          ) : null}
        </form>
      </div>

      {isSelf && (
        <div className="card mt-6 max-w-2xl border-danger/30">
          <h3 className="font-semibold mb-3">Выход из аккаунта</h3>
          <p className="theme-muted text-sm mb-3">Вы выйдете из аккаунта на этом устройстве</p>
          <button onClick={logout} className="btn-danger">
            Выйти из аккаунта
          </button>
        </div>
      )}
    </div>
  );
}
