import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../shared/api-client';
import { useToast } from '../app/ToastProvider';
import { BooomSheet } from '../app/BooomSheet';

export function Wishlists() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<'all' | 'mine' | 'personal' | 'shared'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PERSONAL' | 'SHARED'>('PERSONAL');

  const { data: wishlists, isLoading } = useQuery({
    queryKey: ['wishlists', scope],
    queryFn: () => api.get<any[]>(`/wishlists?scope=${scope}`),
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/wishlists', { title, description, visibility });
      queryClient.invalidateQueries({ queryKey: ['wishlists'] });
      setShowCreate(false);
      setTitle('');
      setDescription('');
    } catch (err: any) {
      toast(err.message ?? 'Ошибка');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Мои желания</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm sm:text-base">
          + Новый список
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'mine', 'personal', 'shared'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`px-4 py-2 rounded-btn text-sm font-medium transition-colors ${
              scope === s
                ? 'bg-primary text-white'
                : 'theme-surface border theme-border theme-muted theme-hover'
            }`}
          >
            {s === 'all' ? 'Все' : s === 'mine' ? 'Мои' : s === 'personal' ? 'Личные' : 'Общие'}
          </button>
        ))}
      </div>
      <p className="text-xs theme-muted mb-4">
        Личные — что хочет партнёр. Мои — что хочу я. Общие — нужное паре.
      </p>
      {/* Create: BottomSheet on mobile, modal on desktop */}
      <BooomSheet open={showCreate} onClose={() => setShowCreate(false)}>
        <h2 className="text-lg font-semibold mb-4">Новый список желаний</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Название</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Описание</label>
            <textarea
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Тип</label>
            <select
              className="input"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
            >
              <option value="PERSONAL">Личный — что хочу я</option>
              <option value="SHARED">Общий — что нужно нам</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
              Отмена
            </button>
            <button type="submit" className="btn-primary flex-1">
              Создать
            </button>
          </div>
        </form>
      </BooomSheet>
      {showCreate && (
        <div
          className="hidden lg:flex fixed inset-0 overlay items-center justify-center z-50"
          onClick={() => setShowCreate(false)}
        >
          <div className="theme-surface rounded-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Новый список желаний</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название</label>
                <input
                  type="text"
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Описание</label>
                <textarea
                  className="input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Тип</label>
                <select
                  className="input"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                >
                  <option value="PERSONAL">Личный — что хочу я</option>
                  <option value="SHARED">Общий — что нужно нам</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                  Отмена
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Создать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wishlist cards */}
      {isLoading ? (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      ) : wishlists?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlists.map((w: any) => (
            <Link
              key={w.id}
              to={`/app/wishes/${w.id}`}
              className="card flex flex-col min-h-[140px] hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold truncate flex-1">{w.title}</h3>
                <span
                  className={`badge flex-shrink-0 ${
                    w.visibility === 'SHARED'
                      ? 'badge-primary'
                      : w.isOwner
                        ? 'badge-success'
                        : 'badge-partner'
                  }`}
                >
                  {w.visibility === 'SHARED'
                    ? 'Общий'
                    : w.isOwner
                      ? 'Мой'
                      : w.owner?.name ?? 'Партнёр'}
                </span>
              </div>
              {w.description && (
                <p className="theme-muted text-sm line-clamp-2 mb-3">{w.description}</p>
              )}
              <div className="text-sm theme-muted mt-auto pt-2">
                {w.wishCount} желаний
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card border-dashed text-center py-12">
          <p className="theme-muted mb-4">Создайте первый список желаний</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm sm:text-base">
            + Новый список
          </button>
        </div>
      )}
    </div>
  );
}
