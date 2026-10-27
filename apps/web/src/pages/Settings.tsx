import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../shared/api-client';
import {
  canUsePush,
  disablePush,
  enablePush,
  hasActivePush,
  isIOS,
  isPushSupported,
  isStandaloneIOS,
} from '../shared/push';
import { useToast } from '../app/ToastProvider';

export function Settings() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const pushSupported = isPushSupported();
  const iosNeedsHomeScreen = isIOS() && !isStandaloneIOS();

  useEffect(() => {
    if (!isPushSupported()) return;
    hasActivePush().then(setPushEnabled).catch(() => undefined);
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    try {
      await api.post('/users/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast('Пароль изменён');
    } catch (err: any) {
      toast(err.message ?? 'Не удалось изменить пароль');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleTogglePush = async () => {
    setPushBusy(true);
    try {
      if (pushEnabled) {
        await disablePush();
        setPushEnabled(false);
        toast('Уведомления выключены');
      } else {
        await enablePush();
        setPushEnabled(true);
        toast('Уведомления включены');
      }
    } catch (err: any) {
      toast(err?.message ?? 'Не удалось изменить подписку');
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">Настройки</h1>
        <Link to="/app/profile" className="btn-secondary text-sm">
          Профиль
        </Link>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div className="card">
          <h3 className="font-semibold mb-3">Пароль</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Текущий пароль</label>
              <input
                type="password"
                className="input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Новый пароль</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <div className="text-xs theme-muted mt-1">Минимум 8 символов</div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={changingPassword}>
              {changingPassword ? 'Сохранение…' : 'Изменить пароль'}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-2">Уведомления</h3>
          <p className="theme-muted text-sm mb-3">
            Сообщать, когда партнёр добавляет дела, общие события или желания
          </p>
          {!pushSupported ? (
            <p className="text-sm theme-muted">Push-уведомления недоступны в этом браузере</p>
          ) : iosNeedsHomeScreen ? (
            <div className="text-sm space-y-2">
              <p className="font-medium">
                На iPhone уведомления работают только из иконки на экране «Домой».
              </p>
              <ol className="list-decimal list-inside theme-muted space-y-1">
                <li>Откройте сайт в Safari (не в другом браузере)</li>
                <li>Нажмите «Поделиться»</li>
                <li>Выберите «На экран «Домой»» → «Добавить»</li>
                <li>Запустите V&amp;Y с иконки и вернитесь в Настройки</li>
              </ol>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn-secondary w-full"
              >
                Я добавил на экран «Домой» — проверить
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handleTogglePush}
                disabled={pushBusy}
                className={pushEnabled ? 'btn-secondary w-full' : 'btn-primary w-full'}
              >
                {pushBusy
                  ? 'Подождите…'
                  : pushEnabled
                    ? 'Выключить уведомления'
                    : 'Включить уведомления'}
              </button>
              {isStandaloneIOS() && (
                <p className="text-xs theme-muted mt-2">
                  Открыто с иконки на экране «Домой» — можно включать уведомления.
                </p>
              )}
            </>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold mb-2">Календарь</h3>
          <p className="theme-muted text-sm mb-3">Подписка на события в Apple Calendar</p>
          <Link to="/app/settings/calendar-feed" className="btn-secondary w-full inline-flex justify-center">
            Подписка на календарь
          </Link>
        </div>
      </div>
    </div>
  );
}
