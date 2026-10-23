import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../shared/api-client';
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

export function Todos() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [assignee, setAssignee] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [dueDate, setDueDate] = useState('');
  const [assigneeChoice, setAssigneeChoice] = useState<'me' | 'partner' | 'both'>('me');

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

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });

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
      alert(err.message);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.post(`/tasks/${id}/complete`);
      invalidate();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReopen = async (id: string) => {
    try {
      await api.post(`/tasks/${id}/reopen`);
      invalidate();
    } catch (err: any) {
      alert(err.message);
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
              onClick={() => setAssignee(s.value)}
              className={`px-3 py-1.5 rounded-btn text-sm ${
                assignee === s.value ? 'bg-primary text-white' : 'bg-surface border border-border text-text-secondary'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <select
          className="input w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="TODO">Ожидает</option>
          <option value="IN_PROGRESS">В работе</option>
          <option value="DONE">Выполнено</option>
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
                task.status === 'DONE' ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() =>
                  task.status === 'DONE' ? handleReopen(task.id) : handleComplete(task.id)
                }
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  task.status === 'DONE'
                    ? 'bg-success border-success text-white'
                    : 'border-border hover:border-primary'
                }`}
              >
                {task.status === 'DONE' && '✓'}
              </button>

              <div className="flex-1 min-w-0">
                <div className={`font-medium ${task.status === 'DONE' ? 'line-through' : ''}`}>
                  {task.title}
                </div>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
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

              <span
                className={`badge ${
                  task.status === 'DONE'
                    ? 'badge-success'
                    : task.status === 'IN_PROGRESS'
                      ? 'badge-primary'
                      : 'badge-warning'
                }`}
              >
                {STATUS_LABELS[task.status] ?? task.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="card border-dashed text-center py-12">
          <p className="text-text-secondary">Задач нет</p>
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 overlay flex items-center justify-center z-50">
          <div className="bg-surface rounded-card p-6 w-full max-w-md">
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
                          : 'border-border text-text-secondary hover:border-primary/50'
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
    </div>
  );
}
