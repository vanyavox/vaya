import { api } from './api-client';

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ may report as Macintosh; detect touch + Mac
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = ua.includes('Macintosh') && 'ontouchend' in document;
  return iOSDevice || iPadOS;
}

export function isStandaloneIOS() {
  // Launched from Home Screen (not a Safari tab)
  return isIOS() && (window.navigator as any).standalone === true;
}

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** True when the browser can actually subscribe (iOS must be Home Screen PWA). */
export function canUsePush() {
  if (!isPushSupported()) return false;
  if (isIOS() && !isStandaloneIOS()) return false;
  return true;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function enablePush(): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Уведомления не поддерживаются в этом браузере');
  }
  if (isIOS() && !isStandaloneIOS()) {
    throw new Error(
      'На iPhone сначала добавьте V&Y на экран «Домой» и откройте приложение с иконки',
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Уведомления запрещены — разрешите их в настройках сайта / iOS'
        : 'Разрешение на уведомления не выдано',
    );
  }

  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const { publicKey } = await api.get<{ publicKey: string }>('/push/vapid-public-key');
  if (!publicKey) throw new Error('VAPID-ключ не настроен');

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = sub.toJSON();
  await api.post('/push/subscribe', {
    endpoint: sub.endpoint,
    keys: {
      p256dh: (json.keys as any)?.p256dh ?? '',
      auth: (json.keys as any)?.auth ?? '',
    },
  });
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined);
    await sub.unsubscribe();
  }
}

export async function hasActivePush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return !!sub;
}
