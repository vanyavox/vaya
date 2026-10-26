import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../shared/api-client';
import { BooomSheet } from '../app/BooomSheet';
import { useConfirm } from '../app/ConfirmProvider';
import { useToast } from '../app/ToastProvider';

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

function KindSelect({ value, onChange }: { value: string; onChange: (kind: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="input w-full flex items-center gap-2"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: KIND_COLORS[value] ?? '#6C5CE7' }}
          />
          {KIND_LABELS[value] ?? value}
        </span>
        <span className="theme-muted text-xs ml-auto pr-1.5 leading-none">▾</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full theme-surface border theme-border rounded-btn shadow-lg overflow-hidden" role="listbox">
          {Object.entries(KIND_LABELS).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="option"
              aria-selected={value === k}
              onClick={() => {
                onChange(k);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left theme-hover ${
                value === k ? 'bg-primary/10 font-medium' : ''
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: KIND_COLORS[k] }}
              />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  return localDateTimeValue(d);
}

function localDateTimeValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function eventTimesForDate(date: Date) {
  const start = new Date(date);
  start.setHours(19, 0, 0, 0);
  const end = new Date(date);
  end.setHours(21, 0, 0, 0);
  return { start: localDateTimeValue(start), end: localDateTimeValue(end) };
}

function isPastEvent(e: { endsAt: string }, now: Date) {
  return new Date(e.endsAt).getTime() < now.getTime();
}

function isMultiDayEvent(e: { startsAt: string; endsAt: string }) {
  const s = new Date(e.startsAt);
  const t = new Date(e.endsAt);
  return (
    s.getFullYear() !== t.getFullYear() ||
    s.getMonth() !== t.getMonth() ||
    s.getDate() !== t.getDate()
  );
}

function eventTouchesDay(e: { startsAt: string; endsAt: string }, y: number, m: number, d: number) {
  const dayStart = new Date(y, m, d).getTime();
  const dayEnd = new Date(y, m, d + 1).getTime();
  return new Date(e.startsAt).getTime() < dayEnd && new Date(e.endsAt).getTime() > dayStart;
}

const CHIP_CLASS =
  'w-full text-[9px] sm:text-xs px-1 py-0.5 truncate text-white text-left hover:opacity-80';

function chipClassFor(e: any, now: Date, opts?: { left?: boolean; right?: boolean }) {
  const past = isPastEvent(e, now);
  return [
    CHIP_CLASS,
    past ? 'opacity-45 line-through hover:opacity-45' : '',
    opts?.left === false ? 'rounded-l-none' : 'rounded-l-btn',
    opts?.right === false ? 'rounded-r-none' : 'rounded-r-btn',
  ]
    .filter(Boolean)
    .join(' ');
}

function formatCountdown(target: Date, now: Date): string {
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'уже идёт';
  const mins = Math.floor(diff / 60000);
  const days = Math.floor(mins / (60 * 24));
  const hours = Math.floor((mins % (60 * 24)) / 60);
  const m = mins % 60;
  if (days > 0) return `через ${days} д ${hours} ч`;
  if (hours > 0) return `через ${hours} ч ${m} мин`;
  return `через ${m} мин`;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} Б`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} КБ`;
  return `${(size / (1024 * 1024)).toFixed(1)} МБ`;
}

const ATTACHMENT_MAX_SIZE = 25 * 1024 * 1024;

export function Calendar() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const [view, setView] = useState<'month' | 'list'>('month');
  const [scope, setScope] = useState<'all' | 'personal' | 'shared'>('all');
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventStart, setEventStart] = useState(() => eventTimesForDate(new Date()).start);
  const [eventEnd, setEventEnd] = useState(() => eventTimesForDate(new Date()).end);
  const [eventLocation, setEventLocation] = useState('');
  const [eventKind, setEventKind] = useState('EVENT');
  const [eventShared, setEventShared] = useState(true);
  const [eventShowCountdown, setEventShowCountdown] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

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
    showCountdown: boolean;
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);

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
      showCountdown: !!selected.showCountdown,
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
        showCountdown: draft.showCountdown,
      });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEditing(false);
      setDraft(null);
    } catch (err: any) {
      toast(err.message ?? 'Не удалось сохранить событие');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const ok = await confirm({
      title: 'Удалить событие?',
      message: 'Файлы события также будут удалены.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/calendar/events/${selected.id}`);
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setSelectedId(null);
      setIsEditing(false);
      setDraft(null);
    } catch (err: any) {
      toast(err.message ?? 'Не удалось удалить событие');
    }
  };

  const closeModal = () => {
    setSelectedId(null);
    setIsEditing(false);
    setDraft(null);
  };

  const handleUploadAttachment = async (file: File) => {
    if (!selected) return;
    if (file.size > ATTACHMENT_MAX_SIZE) {
      toast('Файл больше 25 МБ');
      return;
    }
    try {
      await api.upload(`/calendar/events/${selected.id}/attachments`, file);
      await queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (err: any) {
      toast(err.message ?? 'Не удалось загрузить файл');
    }
  };

  const openAttachment = async (a: { id: string; url: string; originalName: string }) => {
    try {
      const token = api.getToken();
      const res = await fetch(a.url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) {
        toast('Не удалось открыть файл');
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      // Open in a new tab when browser can display it; otherwise download
      const type = res.headers.get('Content-Type') ?? blob.type ?? '';
      if (type.startsWith('image/') || type.startsWith('text/') || type === 'application/pdf') {
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
      } else {
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = a.originalName;
        link.click();
      }
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      toast('Не удалось открыть файл');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selected) return;
    const ok = await confirm({
      title: 'Удалить файл?',
      message: 'Файл будет удалён без возможности восстановления.',
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/calendar/events/${selected.id}/attachments/${attachmentId}`);
      await queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (err: any) {
      toast(err.message ?? 'Не удалось удалить файл');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.post<any>('/calendar/events', {
        title: eventTitle,
        startsAt: new Date(eventStart).toISOString(),
        endsAt: new Date(eventEnd).toISOString(),
        location: eventLocation || undefined,
        kind: eventKind,
        shared: eventShared,
        showCountdown: eventShowCountdown,
      });
      for (const file of pendingFiles) {
        if (file.size > ATTACHMENT_MAX_SIZE) {
          toast(`Файл «${file.name}» больше 25 МБ — пропущен`);
          continue;
        }
        await api.upload(`/calendar/events/${created.id}/attachments`, file);
      }
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowEventForm(false);
      setEventTitle('');
      setPendingFiles([]);
    } catch (err: any) {
      toast(err.message ?? 'Не удалось создать событие');
    }
  };

  // Build month grid
  const firstDay = monthStart.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = firstDay === 0 ? 6 : firstDay - 1; // Convert to Mon=0

  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  while (days.length % 7 !== 0) days.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

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

  const multiDayEvents = (events ?? []).filter(isMultiDayEvent);
  const singleDayEvents = (events ?? []).filter((e: any) => !isMultiDayEvent(e));

  const singleByDay = new Map<number, any[]>();
  singleDayEvents.forEach((e: any) => {
    const d = new Date(e.startsAt).getDate();
    if (!singleByDay.has(d)) singleByDay.set(d, []);
    singleByDay.get(d)!.push(e);
  });

  const monthName = currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const now = new Date();

  const openCreateForm = () => {
    const { start, end } = eventTimesForDate(selectedDate ?? now);
    setEventStart(start);
    setEventEnd(end);
    setEventTitle('');
    setEventLocation('');
    setEventKind('EVENT');
    setEventShared(true);
    setEventShowCountdown(false);
    setPendingFiles([]);
    setShowEventForm(true);
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
    setSelectedDate(null);
  };

  const selectDay = (day: number) => {
    setSelectedDate(new Date(year, month, day));
  };

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
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: KIND_COLORS[selected.kind] ?? '#6C5CE7' }}
                />
                <span>{KIND_LABELS[selected.kind] ?? selected.kind}</span>
              </div>
            </div>

            <div>
              <div className="theme-muted text-xs mb-0.5">Файлы</div>
              {(selected.attachments ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selected.attachments.map((a: any) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => openAttachment(a)}
                      title={`${a.originalName} (${formatFileSize(a.size)})`}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-btn theme-bg theme-hover text-sm text-left"
                    >
                      <span aria-hidden>📎</span>
                      <span className="max-w-[140px] truncate">{a.originalName}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="theme-muted text-sm">Нет файлов</div>
              )}
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
              <KindSelect value={draft.kind} onChange={(kind) => setDraft({ ...draft, kind })} />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.allDay}
                onChange={(e) => setDraft({ ...draft, allDay: e.target.checked })}
              />
              <span className="text-sm">Весь день</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.showCountdown}
                onChange={(e) => setDraft({ ...draft, showCountdown: e.target.checked })}
              />
              <span className="text-sm">Отображать обратный отсчёт</span>
            </label>
            <div>
              <div className="text-sm font-medium mb-1">Файлы</div>
              {(selected?.attachments ?? []).length > 0 && (
                <div className="space-y-1 mb-2">
                  {selected.attachments.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-2 text-sm theme-bg rounded-btn px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => openAttachment(a)}
                        className="flex-1 min-w-0 truncate text-primary hover:underline text-left"
                      >
                        {a.originalName}
                      </button>
                      <span className="text-xs theme-muted flex-shrink-0">{formatFileSize(a.size)}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(a.id)}
                        className="text-danger text-xs flex-shrink-0"
                        aria-label="Удалить файл"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="btn-secondary text-sm cursor-pointer inline-flex items-center">
                + Прикрепить файл
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadAttachment(f);
                    e.target.value = '';
                  }}
                />
              </label>
              <div className="text-xs theme-muted mt-1">до 25 МБ</div>
            </div>
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
        <button onClick={openCreateForm} className="btn-primary text-sm sm:text-base">
          <span className="sm:hidden">+ Событие</span>
          <span className="hidden sm:inline">+ Новое событие</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="btn-secondary px-3 py-1.5"
          >
            ‹
          </button>
          <span className="font-semibold text-base sm:text-lg capitalize min-w-[120px] sm:min-w-[150px]">{monthName}</span>
          <button
            onClick={() => changeMonth(1)}
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

            {/* Weeks: full-height day columns; multi-day chips overlay via grid-column */}
            {weeks.map((week, wi) => {
              const weekBarsRaw = multiDayEvents
                .map((e: any) => {
                  const covered: number[] = [];
                  week.forEach((d, j) => {
                    if (d && eventTouchesDay(e, year, month, d)) covered.push(j);
                  });
                  if (!covered.length) return null;
                  return {
                    e,
                    colStart: covered[0] + 1,
                    colSpan: covered[covered.length - 1] - covered[0] + 1,
                  };
                })
                .filter(Boolean) as { e: any; colStart: number; colSpan: number }[];

              // Pack overlapping multi-day bars into lanes so they don't cover each other
              const sortedBars = [...weekBarsRaw].sort(
                (a, b) => a.colStart - b.colStart || b.colSpan - a.colSpan,
              );
              const laneEnds: number[] = [];
              const weekBars = sortedBars.map((bar) => {
                const colEnd = bar.colStart + bar.colSpan - 1;
                let lane = 0;
                while (lane < laneEnds.length && laneEnds[lane] >= bar.colStart) lane += 1;
                laneEnds[lane] = colEnd;
                return { ...bar, lane };
              });

              return (
                <div
                  key={wi}
                  className="border-b theme-border grid grid-cols-7 min-h-[64px] sm:min-h-[100px]"
                  style={{
                    minHeight:
                      laneEnds.length > 0
                        ? `calc(3.5rem + ${laneEnds.length} * 1.4rem)`
                        : undefined,
                  }}
                >
                  {week.map((day, i) => {
                    const dayTasks = day ? tasksByDay.get(day) ?? [] : [];
                    const dayEvents = day ? singleByDay.get(day) ?? [] : [];
                    const isToday =
                      day === now.getDate() &&
                      month === now.getMonth() &&
                      year === now.getFullYear();
                    const isSelectedDay =
                      !!day &&
                      !!selectedDate &&
                      day === selectedDate.getDate() &&
                      month === selectedDate.getMonth() &&
                      year === selectedDate.getFullYear();

                    return (
                      <div
                        key={i}
                        onClick={day ? () => selectDay(day) : undefined}
                        style={{ gridColumn: i + 1, gridRow: 1 }}
                        className={`relative border-r theme-border p-1 sm:p-2 ${
                          day ? 'cursor-pointer' : 'theme-hover'
                        } ${isSelectedDay ? 'ring-2 ring-inset ring-primary z-10' : ''}`}
                      >
                        {day && (
                          <>
                            <div
                              className={`w-6 h-6 flex items-center justify-center rounded-full text-xs sm:text-sm mb-1 ${
                                isToday
                                  ? 'bg-primary text-white font-bold'
                                  : isSelectedDay
                                    ? 'font-semibold text-primary'
                                    : ''
                              }`}
                            >
                              {day}
                            </div>
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 3).map((e: any) => (
                                <button
                                  key={e.id}
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    openEvent(e);
                                  }}
                                  className={chipClassFor(e, now)}
                                  style={{
                                    backgroundColor: e.color ?? KIND_COLORS[e.kind] ?? '#6C5CE7',
                                  }}
                                  title={e.title}
                                >
                                  {e.title}
                                  {e.showCountdown && !isPastEvent(e, now) && (
                                    <span className="ml-1 opacity-90">
                                      {formatCountdown(new Date(e.startsAt), now)}
                                    </span>
                                  )}
                                </button>
                              ))}
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

                  {/* Multi-day chips: one lane per non-overlapping bar */}
                  {weekBars.map(({ e, colStart, colSpan, lane }) => (
                    <button
                      key={`m-${e.id}`}
                      type="button"
                      onClick={() => openEvent(e)}
                      className={`${chipClassFor(e, now)} z-20 pointer-events-auto`}
                      style={{
                        gridColumn: `${colStart} / span ${colSpan}`,
                        gridRow: 1,
                        alignSelf: 'start',
                        marginTop: `calc(2.15rem + ${lane} * 1.4rem)`,
                        marginInline: '0.25rem',
                        width: 'auto',
                        justifySelf: 'stretch',
                        position: 'relative',
                        backgroundColor: e.color ?? KIND_COLORS[e.kind] ?? '#6C5CE7',
                      }}
                      title={e.title}
                    >
                      {e.title}
                      {e.showCountdown && !isPastEvent(e, now) && (
                        <span className="ml-1 opacity-90">
                          {formatCountdown(new Date(e.startsAt), now)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-2">
          {events?.length ? (
            events.map((e: any) => {
              const past = isPastEvent(e, now);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => openEvent(e)}
                  className={`card flex items-center gap-3 w-full text-left theme-hover cursor-pointer ${
                    past ? 'opacity-50' : ''
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: e.color ?? KIND_COLORS[e.kind] ?? '#6C5CE7' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${past ? 'line-through' : ''}`}>{e.title}</div>
                    <div className="text-xs theme-muted">
                      {e.allDay ? 'Весь день' : new Date(e.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      {e.location ? ` · ${e.location}` : ''}
                      {e.showCountdown && !past ? ` · ${formatCountdown(new Date(e.startsAt), now)}` : ''}
                    </div>
                  </div>
                  <div className="text-xs theme-muted flex-shrink-0">
                    {new Date(e.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </div>
                </button>
              );
            })
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
                <KindSelect value={eventKind} onChange={setEventKind} />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={eventShared} onChange={(e) => setEventShared(e.target.checked)} />
                <span className="text-sm">Общее событие</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={eventShowCountdown}
                  onChange={(e) => setEventShowCountdown(e.target.checked)}
                />
                <span className="text-sm">Отображать обратный отсчёт</span>
              </label>
              <div>
                <div className="text-sm font-medium mb-1">Файлы</div>
                {pendingFiles.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {pendingFiles.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="flex items-center gap-2 text-sm theme-bg rounded-btn px-2 py-1.5">
                        <span className="flex-1 min-w-0 truncate">{f.name}</span>
                        <span className="text-xs theme-muted flex-shrink-0">{formatFileSize(f.size)}</span>
                        <button
                          type="button"
                          onClick={() => setPendingFiles((files) => files.filter((_, j) => j !== i))}
                          className="text-danger text-xs flex-shrink-0"
                          aria-label="Убрать файл"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="btn-secondary text-sm cursor-pointer inline-flex items-center">
                  + Прикрепить файл
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const list = Array.from(e.target.files ?? []);
                      const ok = list.filter((f) => {
                        if (f.size > ATTACHMENT_MAX_SIZE) {
                          toast(`Файл «${f.name}» больше 25 МБ`);
                          return false;
                        }
                        return true;
                      });
                      setPendingFiles((files) => [...files, ...ok]);
                      e.target.value = '';
                    }}
                  />
                </label>
                <div className="text-xs theme-muted mt-1">до 25 МБ</div>
              </div>
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
