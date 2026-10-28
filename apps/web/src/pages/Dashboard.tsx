import { Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../shared/api-client';
import { useAuth } from '../app/AuthContext';

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

function StatusRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="flex items-center gap-2 text-sm theme-muted">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function StatsBucket({ title, stats }: { title: string; stats: any }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-medium theme-muted">{title}</h3>
        <span className="text-sm theme-muted">
          Всего <span className="font-semibold theme-text">{stats?.total ?? 0}</span>
        </span>
      </div>
      <StatusRow label="Ожидают" value={stats?.byStatus?.TODO ?? 0} color="#d97706" />
      <StatusRow label="В работе" value={stats?.byStatus?.IN_PROGRESS ?? 0} color="#6c5ce7" />
      <StatusRow label="Готово" value={stats?.byStatus?.DONE ?? 0} color="#00b894" />
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();

  const { data: tasks } = useQuery({
    queryKey: ['tasks', 'stats'],
    queryFn: () => api.get<any>('/tasks/stats'),
  });

  const { data: events } = useQuery({
    queryKey: ['events', 'today'],
    queryFn: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      return api.get<any[]>(`/calendar/events?from=${start}&to=${end}&scope=all`);
    },
  });

  const { data: upcoming } = useQuery({
    queryKey: ['events', 'upcoming'],
    queryFn: () => {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
      return api.get<any[]>(`/calendar/events?from=${now.toISOString()}&to=${end.toISOString()}&scope=all`);
    },
  });

  const { data: couple } = useQuery({
    queryKey: ['couple'],
    queryFn: () => api.get<any>('/couple').catch(() => null),
    retry: false,
  });


  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  return (
    <div>
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          {greeting}, {user?.name} 👋
        </h1>
        <p className="theme-muted">
          {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="card">
          <div className="theme-muted text-xs sm:text-sm">События сегодня</div>
          <div className="text-2xl sm:text-3xl font-bold">{events?.length ?? 0}</div>
        </div>
        <Link to="/app/todos?assignee=me" className="card theme-hover block">
          <div className="theme-muted text-xs sm:text-sm">Мои задачи</div>
          <div className="text-2xl sm:text-3xl font-bold">{tasks?.personal?.total ?? 0}</div>
        </Link>
        <Link to="/app/todos" className="card theme-hover block">
          <div className="theme-muted text-xs sm:text-sm">Наши задачи</div>
          <div className="text-2xl sm:text-3xl font-bold">{tasks?.couple?.total ?? 0}</div>
        </Link>
        <Link to="/app/todos?status=DONE" className="card theme-hover block">
          <div className="theme-muted text-xs sm:text-sm">Выполнено</div>
          <div className="text-2xl sm:text-3xl font-bold">{tasks?.couple?.byStatus?.DONE ?? 0}</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today events */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Сегодня</h2>
              <Link to="/app/calendar" className="text-primary text-sm hover:underline">
                Календарь →
              </Link>
            </div>
            {events?.length ? (
              <div className="space-y-3">
                {events.map((e: any) => (
                  <div key={e.id} className="flex items-center gap-3 p-2 rounded-btn theme-bg">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: e.color ?? '#6C5CE7' }}
                    />
                    <div>
                      <div className="font-medium">{e.title}</div>
                      <div className="text-sm theme-muted">
                        {e.allDay
                          ? 'Весь день'
                          : `${new Date(e.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
                        {e.location ? ` · ${e.location}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="theme-muted">На сегодня событий нет</p>
            )}
          </div>

          {/* Countdown to upcoming events */}
          <div className="card mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Обратный отсчёт</h2>
              <Link to="/app/calendar" className="text-primary text-sm hover:underline">
                Календарь →
              </Link>
            </div>
            {(() => {
              const now = new Date();
              const list = (upcoming ?? [])
                .filter((e: any) => e.showCountdown && new Date(e.startsAt).getTime() >= now.getTime() - 60 * 60 * 1000)
                .slice(0, 5);
              if (!list.length) {
                return <p className="theme-muted">Событий с обратным отсчётом нет</p>;
              }
              return (
                <div className="space-y-3">
                  {list.map((e: any) => (
                    <div key={e.id} className="flex items-center gap-3 p-2 rounded-btn theme-bg">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: e.color ?? '#6C5CE7' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{e.title}</div>
                        <div className="text-sm theme-muted">
                          {new Date(e.startsAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          {!e.allDay &&
                            ` · ${new Date(e.startsAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-primary flex-shrink-0">
                        {formatCountdown(new Date(e.startsAt), now)}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Tasks summary */}
          <div className="card mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Дела</h2>
              <Link to="/app/todos" className="text-primary text-sm hover:underline">
                Все дела →
              </Link>
            </div>
            {tasks?.personal && tasks?.couple ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <StatsBucket title="Персональные" stats={tasks.personal} />
                <StatsBucket title="Парные" stats={tasks.couple} />
              </div>
            ) : (
              <p className="theme-muted">Загрузка...</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Pairing status */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Связка</h2>
            {couple?.members?.length === 2 ? (
              <div className="flex items-center gap-3">
                {couple.members.map((m: any, i: number) => (
                  <Fragment key={m.userId}>
                    {i > 0 && <span className="text-danger text-lg leading-none">♥</span>}
                    <Link
                      to={`/app/profile/${m.userId}`}
                      className="flex items-center gap-2 hover:opacity-80"
                      title={`Профиль: ${m.name}`}
                    >
                      {m.avatarUrl ? (
                        <img src={m.avatarUrl} alt={m.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                          {m.name[0]}
                        </div>
                      )}
                      <span className="text-sm">{m.name}</span>
                    </Link>
                  </Fragment>
                ))}
              </div>
            ) : (
              <div>
                <p className="theme-muted mb-3">Вы ещё не связаны с партнёром</p>
                <Link to="/app/pairing" className="btn-primary text-sm">
                  Связать пару
                </Link>
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="card mt-6">
            <h2 className="text-lg font-semibold mb-3">Быстрые ссылки</h2>
            <div className="space-y-2">
              <Link to="/app/wishes" className="quick-link">
                🎁 Желания
              </Link>
              <Link to="/app/calendar" className="quick-link">
                📅 Календарь
              </Link>
              <Link to="/app/todos" className="quick-link">
                ✅ Дела
              </Link>
              <Link to="/app/books" className="quick-link">
                📚 Библиотека
              </Link>
              <Link
                to="/app/settings/calendar-feed"
                className="quick-link"
              >
                ⚙️ Подписка на календарь
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
