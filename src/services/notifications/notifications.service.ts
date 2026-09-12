import { createId, dbGet, dbSet } from '@/lib/storage/local-db';
import type { AppNotification } from '@/types/domain';

const KEY = 'notifications';

export async function listNotifications(): Promise<AppNotification[]> {
  const items = await dbGet<AppNotification[]>(KEY, []);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function pushNotification(input: {
  title: string;
  body: string;
  type: AppNotification['type'];
}): Promise<AppNotification> {
  const notification: AppNotification = {
    id: createId('notif'),
    title: input.title,
    body: input.body,
    type: input.type,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const items = await dbGet<AppNotification[]>(KEY, []);
  await dbSet(KEY, [notification, ...items].slice(0, 50));
  return notification;
}

export async function markNotificationRead(id: string) {
  const items = await dbGet<AppNotification[]>(KEY, []);
  await dbSet(
    KEY,
    items.map((item) => (item.id === id ? { ...item, read: true } : item)),
  );
}

export async function seedProactiveNotifications() {
  const existing = await listNotifications();
  if (existing.length > 0) {
    return existing;
  }
  await pushNotification({
    title: 'Leave in 15 minutes',
    body: 'Mock transit reminder: head to the station for your next activity.',
    type: 'transit',
  });
  await pushNotification({
    title: 'Rain expected around 5 PM',
    body: 'Mock weather alert: consider an indoor plan for late afternoon.',
    type: 'weather',
  });
  await pushNotification({
    title: 'Budget check',
    body: 'You have room left in today’s mock daily budget.',
    type: 'budget',
  });
  return listNotifications();
}
