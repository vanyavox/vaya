import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../shared/api-client';

export function Pairing() {
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: couple, isLoading } = useQuery({
    queryKey: ['couple'],
    queryFn: () => api.get<any>('/couple').catch(() => null),
    retry: false,
  });

  const handleCreate = async () => {
    setLoading(true);
    setMessage('');
    try {
      await api.post('/couple');
      queryClient.invalidateQueries({ queryKey: ['couple'] });
      setMessage('Пара создана!');
    } catch (err: any) {
      setMessage(err.message ?? 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await api.post('/couple/join', { inviteCode });
      queryClient.invalidateQueries({ queryKey: ['couple'] });
      setMessage('Вы присоединились к паре!');
    } catch (err: any) {
      setMessage(err.message ?? 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      await api.post('/couple/invite');
      queryClient.invalidateQueries({ queryKey: ['couple'] });
      setMessage('Новый код сгенерирован');
    } catch (err: any) {
      setMessage(err.message ?? 'Ошибка');
    }
  };

  const handleCopy = () => {
    if (couple?.inviteCode) {
      navigator.clipboard.writeText(couple.inviteCode);
      setMessage('Код скопирован!');
    }
  };

  if (isLoading) {
    return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />;
  }

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-8">Связка пары</h1>

      {message && (
        <div className="mb-6 p-3 rounded-btn bg-primary/10 text-primary text-sm">{message}</div>
      )}

      {couple?.members?.length === 2 ? (
        <div className="max-w-lg">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Вы в паре</h2>
            <div className="flex items-center justify-center gap-6">
              {couple.members.map((m: any, i: number) => (
                <div key={m.userId} className="flex flex-col items-center">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt={m.name} className="w-16 h-16 rounded-full" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl sm:text-2xl font-bold">
                      {m.name[0]}
                    </div>
                  )}
                  <span className="mt-2 font-medium">{m.name}</span>
                  <span className="text-xs text-text-secondary">{m.role === 'OWNER' ? 'Владелец' : 'Партнёр'}</span>
                </div>
              ))}
              <div className="text-3xl text-danger">♥</div>
            </div>
          </div>

          {couple.inviteCode && (
            <div className="card mt-6">
              <h3 className="font-semibold mb-3">Код приглашения</h3>
              <div className="flex items-center gap-3">
                <code className="flex-1 p-3 bg-background rounded-btn font-mono text-xl tracking-widest text-center">
                  {couple.inviteCode}
                </code>
                <button onClick={handleCopy} className="btn-secondary">
                  Скопировать
                </button>
                <button onClick={handleRegenerate} className="btn-danger">
                  Новый код
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-lg space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Создать пару</h2>
            <p className="text-text-secondary mb-4">
              Создайте пару и поделитесь кодом с партнёром
            </p>
            <button onClick={handleCreate} className="btn-primary" disabled={loading}>
              {loading ? 'Создание...' : 'Создать пару'}
            </button>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold mb-3">Присоединиться</h2>
            <p className="text-text-secondary mb-4">
              Введите код приглашения от партнёра
            </p>
            <form onSubmit={handleJoin} className="flex gap-3">
              <input
                type="text"
                className="input font-mono text-center tracking-widest"
                placeholder="КОД"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={8}
                required
              />
              <button type="submit" className="btn-primary whitespace-nowrap" disabled={loading}>
                Присоединиться
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
