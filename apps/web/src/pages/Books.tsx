import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../shared/api-client';
import { useToast } from '../app/ToastProvider';
import { BooomSheet } from '../app/BooomSheet';

const STATUS_LABELS: Record<string, string> = {
  UNREAD: 'Не прочитана',
  READ: 'Прочитана',
};

const STATUS_BADGE: Record<string, string> = {
  UNREAD: 'badge-warning',
  READ: 'badge-success',
};

const PER_PAGE_OPTIONS = [6, 12, 24, 48];

type BookForm = {
  title: string;
  author: string;
  description: string;
  status: 'UNREAD' | 'READ';
};

const emptyForm: BookForm = {
  title: '',
  author: '',
  description: '',
  status: 'UNREAD',
};

export function Books() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'UNREAD' | 'READ'>('all');
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BookForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['books', statusFilter, search, sortDir, page, perPage],
    queryFn: () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('q', search);
      params.set('sort', sortDir);
      params.set('page', String(page));
      params.set('perPage', String(perPage));
      return api.get<{ items: any[]; total: number; page: number; perPage: number; totalPages: number }>(
        `/books?${params}`,
      );
    },
  });

  const books = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['books'] });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (book: any) => {
    setEditingId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      description: book.description ?? '',
      status: book.status,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.patch(`/books/${editingId}`, {
          title: form.title,
          author: form.author,
          description: form.description || undefined,
          status: form.status,
        });
      } else {
        await api.post('/books', {
          title: form.title,
          author: form.author,
          description: form.description || undefined,
          status: form.status,
        });
      }
      invalidate();
      closeForm();
    } catch (err: any) {
      toast(err.message ?? 'Ошибка');
    }
  };

  const handleToggleStatus = async (book: any) => {
    try {
      await api.post(`/books/${book.id}/status`, {
        status: book.status === 'READ' ? 'UNREAD' : 'READ',
      });
      invalidate();
    } catch (err: any) {
      toast(err.message ?? 'Ошибка');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/books/${deleteTarget.id}`);
      setDeleteTarget(null);
      closeForm();
      // If we deleted the last item on the last page, step back
      if (books.length === 1 && page > 1) setPage(page - 1);
      invalidate();
    } catch (err: any) {
      setDeleteTarget(null);
      toast(err.message ?? 'Ошибка');
    }
  };

  const formBody = (
    <>
      <h2 className="text-lg font-semibold mb-4">
        {editingId ? 'Редактировать данные о книге' : 'Новая книга'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Название</label>
          <input
            type="text"
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Автор</label>
          <input
            type="text"
            className="input"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Описание</label>
          <textarea
            className="input"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Статус</label>
          <select
            className="input"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as 'UNREAD' | 'READ' })}
          >
            <option value="UNREAD">Не прочитана</option>
            <option value="READ">Прочитана</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={closeForm} className="btn-secondary flex-1">
            Отмена
          </button>
          <button type="submit" className="btn-primary flex-1">
            {editingId ? 'Сохранить' : 'Добавить'}
          </button>
        </div>
        {editingId && (
          <button
            type="button"
            onClick={() => setDeleteTarget({ id: editingId, title: form.title })}
            className="btn-danger w-full"
          >
            Удалить книгу
          </button>
        )}
      </form>
    </>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Библиотека</h1>
        <button onClick={openCreate} className="btn-primary text-sm sm:text-base">
          + Новая книга
        </button>
      </div>

      {/* Filters: status + search + sort */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1">
          {[
            { value: 'all' as const, label: 'Все' },
            { value: 'UNREAD' as const, label: 'Не прочитана' },
            { value: 'READ' as const, label: 'Прочитана' },
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => {
                setStatusFilter(s.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-btn text-sm ${
                statusFilter === s.value
                  ? 'bg-primary text-white'
                  : 'theme-surface border theme-border theme-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          className="input w-auto flex-1 min-w-[180px]"
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <button
          type="button"
          onClick={() => {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
            setPage(1);
          }}
          className="btn-secondary text-sm"
          title="Сортировка по алфавиту"
        >
          А–Я {sortDir === 'asc' ? '↑' : '↓'}
        </button>

        <select
          className="input w-auto"
          value={perPage}
          onChange={(e) => {
            setPerPage(Number(e.target.value));
            setPage(1);
          }}
          title="Книг на странице"
          aria-label="Книг на странице"
        >
          {PER_PAGE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} на стр.
            </option>
          ))}
        </select>
      </div>

      {/* Book list */}
      {isLoading ? (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      ) : books.length ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book: any) => (
              <div key={book.id} className="card flex flex-col min-h-[140px]">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold break-words flex-1">{book.title}</h3>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(book)}
                    className={`badge flex-shrink-0 cursor-pointer ${STATUS_BADGE[book.status] ?? 'badge-neutral'}`}
                    title={book.status === 'READ' ? 'Отметить как непрочитанную' : 'Отметить как прочитанную'}
                  >
                    {STATUS_LABELS[book.status] ?? book.status}
                  </button>
                </div>
                <div className="text-sm theme-muted mb-2">{book.author}</div>
                {book.description && (
                  <p className="text-sm theme-muted line-clamp-2 mb-3">{book.description}</p>
                )}
                <div className="mt-auto pt-2">
                  <button
                    type="button"
                    onClick={() => openEdit(book)}
                    className="btn-secondary text-sm px-3 py-1.5"
                  >
                    Редактировать
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-6">
            <div className="text-sm theme-muted">
              {total} {total === 1 ? 'книга' : total < 5 ? 'книги' : 'книг'} · стр. {page} из {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Назад
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} className="flex items-center">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 theme-muted text-sm">…</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPage(p)}
                        className={`min-w-[2rem] h-8 rounded-btn text-sm ${
                          p === page
                            ? 'bg-primary text-white'
                            : 'theme-surface border theme-border theme-muted theme-hover'
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
              </div>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперёд →
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="card border-dashed text-center py-12">
          <p className="theme-muted mb-4">
            {search || statusFilter !== 'all'
              ? 'Книги не найдены'
              : 'Добавьте первую книгу в библиотеку'}
          </p>
          {!search && statusFilter === 'all' && (
            <button onClick={openCreate} className="btn-primary text-sm sm:text-base">
              + Новая книга
            </button>
          )}
        </div>
      )}

      {/* Create/edit: BottomSheet on mobile, modal on desktop */}
      <BooomSheet open={showForm} onClose={closeForm}>
        {formBody}
      </BooomSheet>
      {showForm && (
        <div
          className="hidden lg:flex fixed inset-0 overlay items-center justify-center z-50"
          onClick={closeForm}
        >
          <div className="theme-surface rounded-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            {formBody}
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 overlay flex items-center justify-center z-[60] p-4">
          <div
            className="theme-surface rounded-card p-6 w-full max-w-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-book-title"
          >
            <h2 id="delete-book-title" className="text-lg font-semibold mb-2">
              Удалить книгу?
            </h2>
            <p className="theme-muted text-sm mb-6">
              «{deleteTarget.title}» будет удалена безвозвратно.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary flex-1"
              >
                Отмена
              </button>
              <button type="button" onClick={handleConfirmDelete} className="btn-danger flex-1">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
