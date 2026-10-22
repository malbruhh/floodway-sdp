import type { AlertEvent } from '../../types/vision';

export const notificationsSupported = (): boolean => typeof window !== 'undefined' && 'Notification' in window;
export const notificationPermission = (): NotificationPermission | 'unsupported' =>
  notificationsSupported() ? Notification.permission : 'unsupported';

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

/** Browser notification + vibration for a new WARNING/DANGER alert. Silent no-op when not permitted. */
export function showBrowserAlert(alert: AlertEvent): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const clear = alert.kind === 'all_clear';
  const title = clear ? 'FloodWay all clear' : alert.level === 'DANGER' ? 'FloodWay DANGER' : 'FloodWay WARNING';
  try {
    new Notification(title, { body: alert.message, tag: `floodway-${alert.camera_id}`, requireInteraction: !clear && alert.level === 'DANGER' });
    if (!clear && 'vibrate' in navigator) navigator.vibrate(alert.level === 'DANGER' ? [300, 120, 300, 120, 300] : [200, 100, 200]);
  } catch {
    /* some mobile browsers only allow notifications through a service worker */
  }
}
