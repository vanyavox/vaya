import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../shared/api-client';
import { BooomSheet } from '../app/BooomSheet';

const KIND_COLORS: Record<string, string> = {
  EVENT: '#6C5CE7',
  MEETING: '#A29BFE',
  DATE: '#FD79A8',
  HOLIDAY: '#E17055',
};

const KIND_LABELS: Record<string, string> = {
  EVENT: 'Событие',
  MEETING: 'Встреча',
  DATE: 'Свидание',
  HOLIDAY: 'Праздник',
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Calendar() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'month' | 'list'>('month');
  const [scope, setScope] = useState<'all' | 'personal' | 'shared'>('all');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // July 2026
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventStart, setEventStart] = useState('2026-07-18T19:00');
  const [eventEnd, setEventEnd] = useState('2026-07-18T21:00');
  const [eventLocation, setEventLocation] = useState('');
  const [eventKind, setEventKind] = useState('EVENT');
  const [eventShared, setEventShared] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    description: string;
    location: string;
    startsAt: string;
    endsAt: string;
    allDay: boolean;
    kind: string;
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const { data: events } = useQuery({
    queryKey: ['events', scope, year, month],
    queryFn: () =>
      api.get<any[]>(
        `/calendar/events?from=${monthStart.toISOString()}&to=${monthEnd.toISOString()}&scope=${scope}`,
      ),
  });

  const { data: tasks } = useQuery({
    queryKey: ['cal-tasks', year, month],
    queryFn: () =>
      api.get<any[]>(`/calendar/tasks?from=${monthStart.toISOString()}&to=${monthEnd.toISOString()}`),
  });

  const selected = selectedId
    ? events?.find((e: any) => e.id === selectedId) ?? null
    : null;

  const openEvent = (e: any) => {
    setSelectedId(e.id);
    setIsEditing(false);
    setDraft(null);
  };

  const startEdit = () => {
    if (!selected) return;
    setIsEditing(true);
    setDraft({
      title: selected.title,
      description: selected.description ?? '',
      location: selected.location ?? '',
      startsAt: toLocalInput(selected.startsAt),
      endsAt: toLocalInput(selected.endsAt),
      allDay: selected.allDay,
      kind: selected.kind,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !draft) return;
    try {
      await api.patch(`/calendar/events/${selected.id}`, {
        title: draft.title,
        description: draft.description || null,
        location: draft.location || null,
        startsAt: new Date(draft.startsAt).toISOString(),
        endsAt: new Date(draft.endsAt).toISOString(),
        allDay: draft.allDay,
        kind: draft.kind,
      });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEditing(false);
      setDraft(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm('Удалить событие?')) return;
    try {
      await api.delete(`/calendar/events/${selected.id}`);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedId(null);
      setIsEditing(false);
      setDraft(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const closeModal = () => {
    setSelectedId(null);
    setIsEditing(false);
    setDraft(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/calendar/events', {
        title: eventTitle,
        startsAt: new Date(eventStart).toISOString(),
        endsAt: new Date(eventEnd).toISOString(),
        location: eventLocation || undefined,
        kind: eventKind,
        shared: eventShared,
      });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowEventForm(false);
      setEventTitle('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Build month grid
  const firstDay = monthStart.getDay(); // 0=Sun
  const daysInMonth = monthEnd.getDate();
  const startDay = firstDay === 0 ? 6 : firstDay - 1; // Convert to Mon=0

  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);

  const eventsByDay = new Map<number, any[]>();
  events?.forEach((e: any) => {
    const d = new Date(e.startsAt).getDate();
    if (!eventsByDay.has(d)) eventsByDay.set(d, []);
    eventsByDay.get(d)!.push(e);
  });

  const tasksByDay = new Map<number, any[]>();
  tasks?.forEach((t: any) => {
    if (!t.dueDate) return;
    const d = new Date(t.dueDate).getDate();
    if (!tasksByDay.has(d)) tasksByDay.set(d, []);
    tasksByDay.get(d)!.push(t);
  });

  const monthName = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const eventBody = selected
    ? !isEditing || !draft ? (
        <>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selected.color ?? KIND_COLORS[selected.kind] ?? '#6C5CE7' }}
              />
              <h2 className="text-lg font-semibold">{selected.title}</h2>
            </div>
            <button onClick={closeModal} className="theme-muted text-xl leading-none px-1" aria-label="Закрыть">
              ×
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <div className="theme-muted text-xs mb-0.5">Когда</div>
              <div>
                {new Date(selected.startsAt).toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
                {!selected.allDay && (
                  <>
                    {' · '}
                    {new Date(selected.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    {' — '}
                    {new Date(selected.endsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </>
                )}
                {selected.allDay && ' · Весь день'}
              </div>
            </div>

            {selected.location && (
              <div>
                <div className="theme-muted text-xs mb-0.5">Место</div>
                <div>{selected.location}</div>
              </div>
            )}

            {selected.description && (
              <div>
                <div className="theme-muted text-xs mb-0.5">Описание</div>
                <div className="whitespace-pre-wrap">{selected.description}</div>
              </div>
            )}

            <div>
              <div className="theme-muted text-xs mb-0.5">Тип</div>
              <div>{KIND_LABELS[selected.kind] ?? selected.kind}</div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={handleDelete} className="btn-secondary text-sm text-danger">
              Удалить
            </button>
            <button onClick={startEdit} className="btn-primary flex-1">
              Редактировать
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold mb-4">Редактировать событие</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Название</label>
              <input
                type="text"
                className="input"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Описание</label>
              <textarea
                className="input"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Место</label>
              <input
                type="text"
                className="input"
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Начало</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={draft.startsAt}
                  onChange={(e) => setDraft({ ...draft, startsAt: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Окончание</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={draft.endsAt}
                  onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Тип</label>
              <select
                className="input"
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
              >
                {Object.entries(KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.allDay}
                onChange={(e) => setDraft({ ...draft, allDay: e.target.checked })}
              />
              <span className="text-sm">Весь день</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setDraft(null);
                }}
                className="btn-secondary flex-1"
              >
                Отмена
              </button>
              <button type="submit" className="btn-primary flex-1">
                Сохранить
              </button>
            </div>
          </form>
        </>
      )
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Календарь</h1>
        <button onClick={() => setShowEventForm(true)} className="btn-primary text-sm sm:text-base">
          <span className="sm:hidden">+ Событие</span>
          <span className="hidden sm:inline">+ Новое событие</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="btn-secondary px-3 py-1.5"
          >
            ‹
          </button>
          <span className="font-semibold text-base sm:text-lg capitalize min-w-[120px] sm:min-w-[150px]">{monthName}</span>
          <button
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="btn-secondary px-3 py-1.5"
          >
            ›
          </button>
        </div>

        <div className="flex gap-1">
          {(['all', 'personal', 'shared'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-2 sm:px-3 py-1 rounded-btn text-xs sm:text-sm ${
                scope === s ? 'bg-primary text-white' : 'theme-surface border theme-border theme-muted'
              }`}
            >
              {s === 'all' ? 'Все' : s === 'personal' ? 'Личные' : 'Общие'}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1 rounded-btn text-xs sm:text-sm ${
              view === 'month' ? 'bg-primary text-white' : 'theme-surface border theme-border theme-muted'
            }`}
          >
            Месяц
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1 rounded-btn text-xs sm:text-sm ${
              view === 'list' ? 'bg-primary text-white' : 'theme-surface border theme-border theme-muted'
            }`}
          >
            Список
          </button>
        </div>
      </div>

      {/* Month grid */}
      {view === 'month' && (
        <div className="card p-0 overflow-x-auto">
          <div className="min-w-[560px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 theme-bg border-b theme-border">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
                <div key={d} className="p-2 text-center text-xs font-medium theme-muted">
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const dayEvents = day ? eventsByDay.get(day) ?? [] : [];
                const dayTasks = day ? tasksByDay.get(day) ?? [] : [];
                const isToday = day === 16 && month === 6 && year === 2026;

                return (
                  <div
                    key={i}
                    className={`min-h-[64px] sm:min-h-[100px] border-b border-r theme-border p-1 sm:p-2 ${
                      day ? '' : 'theme-hover'
                    }`}
                  >
                    {day && (
                      <>
                        <div
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-xs sm:text-sm mb-0.5 ${
                            isToday ? 'bg-primary text-white font-bold' : ''
                          }`}
                        >
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 1).map((e: any) => (
                            <button
                              key={e.id}
                              type="button"
                              onClick={() => openEvent(e)}
                              className="w-full text-[9px] sm:text-xs px-1 py-0.5 rounded truncate text-white text-left hover:opacity-80"
                              style={{ backgroundColor: e.color ?? KIND_COLORS[e.kind] ?? '#6C5CE7' }}
                            >
                              {e.title}
                            </button>
                          ))}
                          {dayEvents.length > 1 && (
                            <div className="text-[9px] sm:text-xs theme-muted">+{dayEvents.length - 1}</div>
                          )}
                          {dayTasks.length > 0 && (
                            <div className="flex gap-0.5">
                              {dayTasks.slice(0, 3).map((t: any) => (
                                <div key={t.id} className="w-1 h-1 rounded-full bg-text-secondary" />
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-2">
          {events?.length ? (
            events.map((e: any) => (
              <button
                key={e.id}
                type="button"
                onClick={() => openEvent(e)}
                className="card flex items-center gap-3 w-full text-left theme-hover cursor-pointer"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: e.color ?? KIND_COLORS[e.kind] ?? '#6C5CE7' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{e.title}</div>
                  <div className="text-xs theme-muted">
                    {e.allDay ? 'Весь день' : new Date(e.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    {e.location ? ` · ${e.location}` : ''}
                  </div>
                </div>
                <div className="text-xs theme-muted flex-shrink-0">
                  {new Date(e.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </div>
              </button>
            ))
          ) : (
            <div className="card text-center py-8 theme-muted">Событий нет</div>
          )}
        </div>
      )}

      {/* Event detail: Booom Sheet on mobile, modal on desktop */}
      <BooomSheet open={!!selected} onClose={closeModal}>
        {eventBody}
      </BooomSheet>

      {selected && (
        <div className="hidden lg:flex fixed inset-0 overlay items-center justify-center z-50" onClick={closeModal}>
          <div
            className="theme-surface rounded-card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {eventBody}
          </div>
        </div>
      )}

      {/* Event form modal */}
      {showEventForm && (
        <div className="fixed inset-0 overlay flex items-center justify-center z-50">
          <div className="theme-surface rounded-card p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Новое событие</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Название</label>
                <input type="text" className="input" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Место</label>
                <input type="text" className="input" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Начало</label>
                  <input type="datetime-local" className="input" value={eventStart} onChange={(e) => setEventStart(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Окончание</label>
                  <input type="datetime-local" className="input" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Тип</label>
                <select className="input" value={eventKind} onChange={(e) => setEventKind(e.target.value)}>
                  <option value="EVENT">Событие</option>
                  <option value="MEETING">Встреча</option>
                  <option value="DATE">Свидание</option>
                  <option value="HOLIDAY">Праздник</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={eventShared} onChange={(e) => setEventShared(e.target.checked)} />
                <span className="text-sm">Общее событие</span>
              </label>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowEventForm(false)} className="btn-secondary flex-1">
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
