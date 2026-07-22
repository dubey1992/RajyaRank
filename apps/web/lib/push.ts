import { API_BASE } from './api';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** Subscribe the browser to web push. Returns 'enabled' | 'denied' | 'unsupported' | 'unavailable'. */
export async function enablePush(): Promise<'enabled' | 'denied' | 'unsupported' | 'unavailable'> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';

  const info = await fetch(`${API_BASE}/api/v1/student/notifications/push/vapid-key`, { credentials: 'include' })
    .then((r) => r.json())
    .catch(() => null);
  const key: string | undefined = info?.data?.key;
  const enabled: boolean | undefined = info?.data?.enabled;
  if (!enabled || !key) return 'unavailable';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
  });
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
  await fetch(`${API_BASE}/api/v1/student/notifications/push/subscribe`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  return 'enabled';
}
