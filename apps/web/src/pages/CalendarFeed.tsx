import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../shared/api-client';

export function CalendarFeed() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data: feed } = useQuery({
    queryKey: ['feed-token'],
    queryFn: () => api.get<any>('/calendar/feed-token'),
  });

  const handleRegenerate = async () => {
    if (!confirm('Перевыпустить токен? Старая ссылка перестанет работать.')) return;
    try {
      await api.post('/calendar/feed-token');
      queryClient.invalidateQueries({ queryKey: ['feed-token'] });
      setMessage('Новый токен сгенерирован');
    } catch (err: any) {
      setMessage(err.message ?? 'Ошибка');
    }
  };

  const handleCopy = () => {
    if (feed?.feedUrl) {
      navigator.clipboard.writeText(feed.feedUrl);
      setMessage('Ссылка скопирована!');
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-2">Подписка на календарь</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Добавьте календарь Vaya в Apple Calendar, чтобы видеть события на всех устройствах
      </p>

      {message && (
        <div className="mb-6 p-3 rounded-btn bg-primary/10 text-primary text-sm">{message}</div>
      )}

      <div className="max-w-2xl space-y-6">
        {/* Feed URL */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Ссылка для подписки</h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              className="input flex-1 font-mono text-sm"
              value={feed?.feedUrl ?? 'Загрузка...'}
              readOnly
            />
            <button onClick={handleCopy} className="btn-primary whitespace-nowrap">
              Скопировать
            </button>
          </div>
          {feed?.webcalUrl && (
            <div className="mt-3">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Или webcal-ссылка:</div>
              <code className="text-xs bg-gray-50 dark:bg-gray-950 p-2 rounded block">{feed.webcalUrl}</code>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-3">Как добавить в Apple Calendar</h2>
          <ol className="space-y-3 text-sm">
            <li>
              <strong>На iPhone / iPad:</strong>
              <br />
              Настройки → Календарь → Учетные записи → Добавить подписку календаря → вставьте ссылку
            </li>
            <li>
              <strong>На Mac:</strong>
              <br />
              Календарь → Файл → Новая подписка календаря → вставьте ссылку
            </li>
            <li>
              Нажмите «Подписаться» — события появятся автоматически
            </li>
          </ol>
        </div>

        {/* Warning */}
        <div className="card border-warning/50 bg-warning/5">
          <h3 className="font-semibold mb-2">⚠️ Перевыпуск токена</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            При перевыпуске старая ссылка перестанет работать. Вам нужно будет заново подписаться в
            календаре.
          </p>
          <button onClick={handleRegenerate} className="btn-danger">
            Перевыпустить токен
          </button>
        </div>
      </div>
    </div>
  );
}
