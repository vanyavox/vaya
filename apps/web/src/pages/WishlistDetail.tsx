import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../shared/api-client';
import { useConfirm } from '../app/ConfirmProvider';
import { useToast } from '../app/ToastProvider';

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
  const confirmDelete = useConfirm();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showWishForm, setShowWishForm] = useState(false);
  const [wishTitle, setWishTitle] = useState('');
  const [wishPrice, setWishPrice] = useState('');
  const [wishUrl, setWishUrl] = useState('');
  const [wishPriority, setWishPriority] = useState('MEDIUM');
  const [editingWishId, setEditingWishId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editPriority, setEditPriority] = useState('MEDIUM');

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
        url: wishUrl.trim() || undefined,
        priority: wishPriority,
      });
      queryClient.invalidateQueries({ queryKey: ['wishlist', id] });
      setWishTitle('');
      setWishPrice('');
      setWishUrl('');
      setWishPriority('MEDIUM');
      setShowWishForm(false);
    } catch (err: any) {
      toast(err.message ?? 'Не удалось сохранить желание');
    }
  };

  const handleAction = async (wishId: string, action: string) => {
    try {
      await api.post(`/wishes/${wishId}/${action}`);
      invalidate();
    } catch (err: any) {
      toast(err.message ?? 'Ошибка');
    }
  };

  const startEditWish = (wish: any) => {
    setEditingWishId(wish.id);
    setEditTitle(wish.title);
    setEditPrice(wish.price != null ? String(wish.price) : '');
    setEditUrl(wish.url ?? '');
    setEditPriority(wish.priority ?? 'MEDIUM');
  };

  const handleUpdateWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWishId) return;
    try {
      await api.patch(`/wishes/${editingWishId}`, {
        title: editTitle,
        price: editPrice ? Number(editPrice) : null,
        url: editUrl.trim() || null,
        priority: editPriority,
      });
      invalidate();
      setEditingWishId(null);
    } catch (err: any) {
      toast(err.message ?? 'Не удалось сохранить желание');
    }
  };

  const handleDeleteWish = async (wishId: string) => {
    const ok = await confirmDelete({
      title: 'Удалить желание?',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/wishes/${wishId}`);
      invalidate();
    } catch (err: any) {
      toast(err.message ?? 'Не удалось удалить желание');
    }
  };

  const handleDelete = async () => {
    const okList = await confirmDelete({
      title: 'Удалить список желаний?',
      message: 'Все желания в списке также будут удалены.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!okList) return;
    try {
      await api.delete(`/wishlists/${id}`);
      navigate('/app/wishes');
    } catch (err: any) {
      toast(err.message ?? 'Ошибка');
    }
  };

  if (isLoading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />;
  if (!wishlist) return <p>Список не найден</p>;

  return (
    <div>
      <div className="flex items-center gap-2 text-sm theme-muted mb-4">
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
              {wishlist.visibility === 'SHARED' ? 'Общий' : wishlist.isOwner ? 'Мой' : 'Личный'}
            </span>
          </div>
          {wishlist.description && (
            <p className="theme-muted mt-1">{wishlist.description}</p>
          )}
        </div>
        {wishlist.isOwner && (
          <button onClick={handleDelete} className="btn-danger">
            Удалить
          </button>
        )}
      </div>

      {/* Wishes grid */}
      {wishlist.wishes?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlist.wishes.map((wish: any) => (
            <div key={wish.id} className="card">
              {wish.imageUrl ? (
                <img src={wish.imageUrl} alt={wish.title} className="w-full h-32 object-cover rounded-btn mb-3" />
              ) : (
                <div className="w-full h-32 theme-bg rounded-btn mb-3 flex items-center justify-center text-3xl">
                  🎁
                </div>
              )}
              <h3 className="font-semibold mb-1">{wish.title}</h3>
              {wish.price && (
                <div className="text-lg font-bold text-primary mb-2">
                  {Number(wish.price).toLocaleString('ru-RU')} {wish.currency}
                </div>
              )}
              {wish.url && (
                <a
                  href={wish.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-xs inline-flex items-center gap-1 mb-2 px-3 py-1.5"
                >
                  🛍 Купить подарок
                </a>
              )}
              {!wish.url && (
                <div className="text-xs theme-muted mb-2">Ссылка на покупку не указана</div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge ${STATUS_LABELS[wish.status]?.class ?? 'badge-primary'}`}>
                  {STATUS_LABELS[wish.status]?.label ?? wish.status}
                </span>
                <span className="badge badge-neutral">
                  {PRIORITY_LABELS[wish.priority] ?? wish.priority}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
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
                {(wishlist.isOwner || wishlist.visibility === 'SHARED') && (
                  <>
                    <button onClick={() => startEditWish(wish)} className="btn-secondary text-xs px-3">
                      Изменить
                    </button>
                    <button onClick={() => handleDeleteWish(wish.id)} className="btn-secondary text-xs px-3 text-danger">
                      Удалить
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card border-dashed text-center py-12">
          <p className="theme-muted mb-4">Добавьте первое желание</p>
        </div>
      )}

      {/* FAB — only when I can add wishes (own list or shared) */}
      {(wishlist.isOwner || wishlist.visibility === 'SHARED') && (
        <button
          onClick={() => setShowWishForm(true)}
          className="fixed bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full text-2xl shadow-lg hover:bg-primary-dark"
        >
          +
        </button>
      )}

      {/* Edit wish modal */}
      {editingWishId && (
        <div className="fixed inset-0 overlay flex items-center justify-center z-50">
          <div className="theme-surface rounded-card p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Изменить желание</h2>
            <form onSubmit={handleUpdateWish} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название</label>
                <input type="text" className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Цена</label>
                <input type="number" className="input" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ссылка (где купить)</label>
                <input
                  type="url"
                  className="input"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Приоритет</label>
                <select className="input" value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                  <option value="LOW">Низкий</option>
                  <option value="MEDIUM">Средний</option>
                  <option value="HIGH">Высокий</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingWishId(null)} className="btn-secondary flex-1">
                  Отмена
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Wish form modal */}
      {showWishForm && (
        <div className="fixed inset-0 overlay flex items-center justify-center z-50">
          <div className="theme-surface rounded-card p-6 w-full max-w-md">
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
                <label className="block text-sm font-medium mb-1">Ссылка (где купить)</label>
                <input
                  type="url"
                  className="input"
                  value={wishUrl}
                  onChange={(e) => setWishUrl(e.target.value)}
                  placeholder="https://..."
                />
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
