import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../shared/api-client';
import { useConfirm } from '../app/ConfirmProvider';
import { useToast } from '../app/ToastProvider';
import { BooomSheet } from '../app/BooomSheet';

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

      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl font-bold break-words">{wishlist.title}</h1>
            <span
              className={`badge ${
                wishlist.visibility === 'SHARED'
                  ? 'badge-primary'
                  : wishlist.isOwner
                    ? 'badge-success'
                    : 'badge-partner'
              }`}
            >
              {wishlist.visibility === 'SHARED'
                ? 'Общий'
                : wishlist.isOwner
                  ? 'Мой'
                  : wishlist.owner?.name ?? 'Партнёр'}
            </span>
          </div>
          {wishlist.description && (
            <p className="theme-muted mt-1">{wishlist.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(wishlist.isOwner || wishlist.visibility === 'SHARED') && (
            <button onClick={() => setShowWishForm(true)} className="btn-primary text-sm">
              + Желание
            </button>
          )}
          {wishlist.isOwner && (
            <button onClick={handleDelete} className="btn-danger text-sm">
              Удалить
            </button>
          )}
        </div>
      </div>

      {/* Wishes grid */}
      {wishlist.wishes?.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {wishlist.wishes.map((wish: any) => (
            <div key={wish.id} className="card flex flex-col p-3 sm:p-4">
              <div className="w-full h-20 sm:h-24 theme-bg rounded-btn mb-2 overflow-hidden">
                {wish.imageUrl ? (
                  <img src={wish.imageUrl} alt={wish.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🎁</div>
                )}
              </div>
              <h3 className="font-semibold text-sm sm:text-base mb-1 line-clamp-2">{wish.title}</h3>
              {wish.price != null && (
                <div className="text-base sm:text-lg font-bold text-primary mb-1">
                  {Number(wish.price).toLocaleString('ru-RU')} {wish.currency}
                </div>
              )}
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`badge ${STATUS_LABELS[wish.status]?.class ?? 'badge-primary'}`}>
                  {STATUS_LABELS[wish.status]?.label ?? wish.status}
                </span>
                <span className="badge badge-neutral">
                  {PRIORITY_LABELS[wish.priority] ?? wish.priority}
                </span>
              </div>
              <div className="mt-auto space-y-2">
                {wish.url ? (
                  <a
                    href={wish.url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-xs w-full flex items-center justify-center gap-1"
                  >
                    🛍 Купить подарок
                  </a>
                ) : (
                  <div className="text-[11px] theme-muted">Ссылка на покупку не указана</div>
                )}
                <div className="flex gap-1.5">
                  {wish.status === 'AVAILABLE' && (
                    <button onClick={() => handleAction(wish.id, 'reserve')} className="btn-secondary text-[11px] sm:text-xs flex-1 min-w-0 px-1 py-1.5 whitespace-nowrap">
                      В резерв
                    </button>
                  )}
                  {wish.status === 'RESERVED' && (
                    <button onClick={() => handleAction(wish.id, 'unreserve')} className="btn-secondary text-[11px] sm:text-xs flex-1 min-w-0 px-1 py-1.5 whitespace-nowrap">
                      Снять
                    </button>
                  )}
                  {wish.status === 'RESERVED' && (
                    <button onClick={() => handleAction(wish.id, 'gift')} className="btn-primary text-[11px] sm:text-xs flex-1 min-w-0 px-1 py-1.5 whitespace-nowrap">
                      Подарено
                    </button>
                  )}
                  {wish.status === 'GIFTED' && (
                    <button onClick={() => handleAction(wish.id, 'receive')} className="btn-primary text-[11px] sm:text-xs flex-1 min-w-0 px-1 py-1.5 whitespace-nowrap">
                      Получено
                    </button>
                  )}
                  {(wishlist.isOwner || wishlist.visibility === 'SHARED') && (
                    <>
                      <button onClick={() => startEditWish(wish)} className="btn-secondary text-[11px] sm:text-xs flex-1 min-w-0 px-1 py-1.5 whitespace-nowrap">
                        Изменить
                      </button>
                      <button onClick={() => handleDeleteWish(wish.id)} className="btn-secondary text-[11px] sm:text-xs flex-1 min-w-0 px-1 py-1.5 whitespace-nowrap text-danger">
                        Удалить
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card border-dashed text-center py-12">
          <p className="theme-muted mb-4">Добавьте первое желание</p>
        </div>
      )}

      {/* Edit wish — BottomSheet on mobile, modal on desktop */}
      <BooomSheet open={!!editingWishId} onClose={() => setEditingWishId(null)}>
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
            <input type="url" className="input" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://..." />
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
      </BooomSheet>
      {editingWishId && (
        <div className="hidden lg:flex fixed inset-0 overlay items-center justify-center z-50" onClick={() => setEditingWishId(null)}>
          <div className="theme-surface rounded-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
                <input type="url" className="input" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://..." />
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

      {/* New wish — BottomSheet on mobile, modal on desktop */}
      <BooomSheet open={showWishForm} onClose={() => setShowWishForm(false)}>
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
            <input type="url" className="input" value={wishUrl} onChange={(e) => setWishUrl(e.target.value)} placeholder="https://..." />
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
      </BooomSheet>
      {showWishForm && (
        <div className="hidden lg:flex fixed inset-0 overlay items-center justify-center z-50" onClick={() => setShowWishForm(false)}>
          <div className="theme-surface rounded-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
                <input type="url" className="input" value={wishUrl} onChange={(e) => setWishUrl(e.target.value)} placeholder="https://..." />
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
