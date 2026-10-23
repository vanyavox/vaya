import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../shared/api-client';

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  AVAILABLE: { label: 'Доступно', class: 'badge-success' },
  RESERVED: { label: 'Зарезервировано', class: 'badge-warning' },
  GIFTED: { label: 'Подарено', class: 'badge-danger' },
  RECEIVED: { label: 'Получено', class: 'badge-primary' },
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
};

export function WishlistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showWishForm, setShowWishForm] = useState(false);
  const [wishTitle, setWishTitle] = useState('');
  const [wishPrice, setWishPrice] = useState('');
  const [wishPriority, setWishPriority] = useState('MEDIUM');

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ['wishlist', id],
    queryFn: () => api.get<any>(`/wishlists/${id}`),
    enabled: !!id,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['wishlist', id] });

  const handleCreateWish = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/wishlists/${id}/wishes`, {
        title: wishTitle,
        price: wishPrice ? Number(wishPrice) : undefined,
        priority: wishPriority,
      });
      invalidate();
      setShowWishForm(false);
      setWishTitle('');
      setWishPrice('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAction = async (wishId: string, action: string) => {
    try {
      await api.post(`/wishes/${wishId}/${action}`);
      invalidate();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить список желаний?')) return;
    try {
      await api.delete(`/wishlists/${id}`);
      navigate('/app/wishes');
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (isLoading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />;
  if (!wishlist) return <p>Список не найден</p>;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
        <button onClick={() => navigate('/app/wishes')} className="hover:underline">
          Мои желания
        </button>
        <span>/</span>
        <span>{wishlist.title}</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{wishlist.title}</h1>
            <span className={`badge ${wishlist.visibility === 'SHARED' ? 'badge-primary' : 'badge-success'}`}>
              {wishlist.visibility === 'SHARED' ? 'Общий' : 'Личный'}
            </span>
          </div>
          {wishlist.description && (
            <p className="text-text-secondary mt-1">{wishlist.description}</p>
          )}
        </div>
        <button onClick={handleDelete} className="btn-danger">
          Удалить
        </button>
      </div>

      {/* Wishes grid */}
      {wishlist.wishes?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.wishes.map((wish: any) => (
            <div key={wish.id} className="card">
              {wish.imageUrl ? (
                <img src={wish.imageUrl} alt={wish.title} className="w-full h-32 object-cover rounded-btn mb-3" />
              ) : (
                <div className="w-full h-32 bg-background rounded-btn mb-3 flex items-center justify-center text-3xl">
                  🎁
                </div>
              )}
              <h3 className="font-semibold mb-1">{wish.title}</h3>
              {wish.price && (
                <div className="text-lg font-bold text-primary mb-2">
                  {Number(wish.price).toLocaleString('ru-RU')} {wish.currency}
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge ${STATUS_LABELS[wish.status]?.class ?? 'badge-primary'}`}>
                  {STATUS_LABELS[wish.status]?.label ?? wish.status}
                </span>
                <span className="badge badge-neutral">
                  {PRIORITY_LABELS[wish.priority] ?? wish.priority}
                </span>
              </div>
              <div className="flex gap-2">
                {wish.status === 'AVAILABLE' && (
                  <button onClick={() => handleAction(wish.id, 'reserve')} className="btn-secondary text-xs flex-1">
                    Зарезервировать
                  </button>
                )}
                {wish.status === 'RESERVED' && (
                  <button onClick={() => handleAction(wish.id, 'unreserve')} className="btn-secondary text-xs flex-1">
                    Снять резерв
                  </button>
                )}
                {wish.status === 'RESERVED' && (
                  <button onClick={() => handleAction(wish.id, 'gift')} className="btn-primary text-xs flex-1">
                    Подарено
                  </button>
                )}
                {wish.status === 'GIFTED' && (
                  <button onClick={() => handleAction(wish.id, 'receive')} className="btn-primary text-xs flex-1">
                    Получено
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card border-dashed text-center py-12">
          <p className="text-text-secondary mb-4">Добавьте первое желание</p>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowWishForm(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full text-2xl shadow-lg hover:bg-primary-dark"
      >
        +
      </button>

      {/* Wish form modal */}
      {showWishForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-surface rounded-card p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Новое желание</h2>
            <form onSubmit={handleCreateWish} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название</label>
                <input type="text" className="input" value={wishTitle} onChange={(e) => setWishTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Цена</label>
                <input type="number" className="input" value={wishPrice} onChange={(e) => setWishPrice(e.target.value)} min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Приоритет</label>
                <select className="input" value={wishPriority} onChange={(e) => setWishPriority(e.target.value)}>
                  <option value="LOW">Низкий</option>
                  <option value="MEDIUM">Средний</option>
                  <option value="HIGH">Высокий</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowWishForm(false)} className="btn-secondary flex-1">
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
    </div>
  );
}
