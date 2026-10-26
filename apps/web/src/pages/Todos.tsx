import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../shared/api-client';
import { useToast } from '../app/ToastProvider';
import { useAuth } from '../app/AuthContext';

const CATEGORY_LABELS: Record<string, string> = {
  CLEANING: 'Уборка',
  COOKING: 'Готовка',
  SHOPPING: 'Покупки',
  REPAIRS: 'Ремонт',
  DOCS: 'Документы',
  PET: 'Питомцы',
  FINANCE: 'Финансы',
  OTHER: 'Другое',
};

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Ожидает',
  IN_PROGRESS: 'В работе',
  DONE: 'Выполнено',
  CANCELLED: 'Отменено',
};

const STATUS_BADGE: Record<string, string> = {
  TODO: 'badge-warning',
  IN_PROGRESS: 'badge-primary',
  DONE: 'badge-success',
  CANCELLED: 'badge-neutral',
};

export function Todos() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const assignee = searchParams.get('assignee') ?? 'all';
  const status = searchParams.get('status') ?? 'all';
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [dueDate, setDueDate] = useState('');
  const [assigneeChoice, setAssigneeChoice] = useState<'me' | 'partner' | 'both'>('me');
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const updateParam = (key: string, value: string, dropValue = 'all') => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === dropValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const { data: couple } = useQuery({
    queryKey: ['couple'],
    queryFn: () => api.get<any>('/couple').catch(() => null),
    retry: false,
  });

  const partner = couple?.members?.find((m: any) => m.userId !== user?.id);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', assignee, status, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (assignee !== 'all') params.set('assignee', assignee);
      if (status !== 'all') params.set('status', status);
      if (search) params.set('q', search);
      return api.get<any[]>(`/tasks?${params}`);
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let assigneeId: string | undefined;
      if (assigneeChoice === 'me') assigneeId = user?.id;
      else if (assigneeChoice === 'partner') assigneeId = partner?.userId;
      else assigneeId = undefined; // both → unassigned

      await api.post('/tasks', {
        title,
        category,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      invalidate();
      setShowForm(false);
      setTitle('');
      setDueDate('');
      setAssigneeChoice('me');
    } catch (err: any) {
      toast(err.message ?? 'Ошибка');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.post(`/tasks/${id}/complete`);
      invalidate();
    } catch (err: any) {
      toast(err.message ?? 'Ошибка');
    }
  };

  const handleReopen = async (id: string) => {
    try {
      await api.post(`/tasks/${id}/reopen`);
      invalidate();
    } catch (err: any) {
      toast(err.message ?? 'Ошибка');
    }
  };

  const handleToggleDone = async (task: { id: string; status: string }) => {
    if (task.status === 'DONE') {
      await handleReopen(task.id);
    } else {
      await handleComplete(task.id);
    }
  };

  const openDelete = (task: { id: string; title: string }) => {
    setStatusMenuId(null);
    setDeleteTarget({ id: task.id, title: task.title });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/tasks/${deleteTarget.id}`);
      setDeleteTarget(null);
      invalidate();
    } catch (err: any) {
      setDeleteTarget(null);
      toast(err.message ?? 'Ошибка');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    setStatusMenuId(null);
    if (status === 'DONE') {
      await handleComplete(id);
      return;
    }
    if (status === 'TODO') {
      await handleReopen(id);
      return;
    }
    try {
      await api.patch(`/tasks/${id}`, { status });
      invalidate();
    } catch (err: any) {
      toast(err.message ?? 'Ошибка');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Дела</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm sm:text-base">
          + Новая задача
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1">
          {[
            { value: 'all', label: 'Все' },
            { value: 'me', label: 'Мои' },
            { value: 'partner', label: 'Партнёра' },
            { value: 'unassigned', label: 'Для двоих' },
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => updateParam('assignee', s.value)}
              className={`px-3 py-1.5 rounded-btn text-sm ${
                assignee === s.value ? 'bg-primary text-white' : 'theme-surface border theme-border theme-muted'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <select
          className="input w-auto"
          value={status}
          onChange={(e) => updateParam('status', e.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="TODO">Ожидает</option>
          <option value="IN_PROGRESS">В работе</option>
          <option value="DONE">Выполнено</option>
          <option value="CANCELLED">Отменено</option>
        </select>

        <input
          type="text"
          className="input w-auto flex-1 min-w-[200px]"
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Task list */}
      {isLoading ? (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      ) : tasks?.length ? (
        <div className="space-y-2">
          {tasks.map((task: any) => (
            <div
              key={task.id}
              className={`card flex items-center gap-4 py-3 ${
                task.status === 'DONE' || task.status === 'CANCELLED' ? 'opacity-60' : ''
              }`}
            >
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={task.status === 'DONE'}
                  onChange={() => handleToggleDone(task)}
                  className="sr-only peer"
                />
                <span
                  className={`check-box peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 ${
                    task.status === 'DONE' ? 'check-box-done' : ''
                  }`}
                >
                  {task.status === 'DONE' && '✓'}
                </span>
              </label>

              <div className="flex-1 min-w-0">
                <div className={`font-medium ${task.status === 'DONE' ? 'line-through' : ''}`}>
                  {task.title}
                </div>
                <div className="flex items-center gap-2 text-xs theme-muted">
                  {task.dueDate && (
                    <span>Срок: {new Date(task.dueDate).toLocaleDateString('ru-RU')}</span>
                  )}
                  {task.assigneeId === user?.id && <span>• Моя</span>}
                  {task.assigneeId && task.assigneeId !== user?.id && <span>• {partner?.name ?? 'Партнёр'}</span>}
                  {!task.assigneeId && <span>• Для двоих</span>}
                </div>
              </div>

              <span className="badge badge-neutral">
                {CATEGORY_LABELS[task.category] ?? task.category}
              </span>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusMenuId(statusMenuId === task.id ? null : task.id)}
                  className={`badge cursor-pointer ${STATUS_BADGE[task.status] ?? 'badge-neutral'}`}
                  title="Изменить статус"
                >
                  {STATUS_LABELS[task.status] ?? task.status}
                  <span className="ml-1 opacity-60">▾</span>
                </button>
                {statusMenuId === task.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setStatusMenuId(null)} />
                    <div className="absolute right-0 top-full mt-1 z-20 theme-surface border theme-border rounded-btn shadow-lg py-1 min-w-[150px]">
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleStatusChange(task.id, value)}
                          className={`w-full text-left px-3 py-2 text-sm theme-hover ${
                            task.status === value ? 'text-primary font-medium' : ''
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => openDelete(task)}
                className="text-danger opacity-70 hover:opacity-100 text-lg leading-none px-1"
                title="Удалить задачу"
                aria-label="Удалить задачу"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="card border-dashed text-center py-12">
          <p className="theme-muted">Задач нет</p>
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 overlay flex items-center justify-center z-50">
          <div className="theme-surface rounded-card p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Новая задача</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название</label>
                <input type="text" className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Исполнитель</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'me', label: 'Моя', icon: user?.name?.[0] ?? 'Я' },
                    { value: 'partner', label: 'Партнёра', icon: partner?.name?.[0] ?? 'П' },
                    { value: 'both', label: 'Для двоих', icon: '👥' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAssigneeChoice(opt.value as any)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-btn border-2 text-sm transition-colors ${
                        assigneeChoice === opt.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'theme-border theme-muted hover:border-primary/50'
                      }`}
                    >
                      <span className="text-lg">{opt.icon}</span>
                      <span className="font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Категория</label>
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Срок</label>
                <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
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

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 overlay flex items-center justify-center z-50">
          <div
            className="theme-surface rounded-card p-6 w-full max-w-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
          >
            <h2 id="delete-task-title" className="text-lg font-semibold mb-2">
              Удалить задачу?
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
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn-danger flex-1"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
