import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView } from '@/components/ui/primitives';
import {
  listNotifications,
  markNotificationRead,
  seedProactiveNotifications,
} from '@/services/notifications/notifications.service';

export function NotificationsScreen() {
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      await seedProactiveNotifications();
      return listNotifications();
    },
  });

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-notifications">
        <SectionHeader
          title="Notifications"
          subtitle="Proactive alerts after permission — mock samples for now"
        />
        {query.data?.map((item) => (
          <Card key={item.id} className="mb-3">
            <AppText className="font-sans-semibold">{item.title}</AppText>
            <AppText muted className="mt-1">
              {item.body}
            </AppText>
            <AppText muted className="mt-1 text-xs">
              {item.type} · {new Date(item.createdAt).toLocaleString()}
              {item.read ? ' · read' : ''}
            </AppText>
            {!item.read ? (
              <Button
                label="Mark read"
                variant="ghost"
                onPress={() =>
                  void markNotificationRead(item.id).then(() => query.refetch())
                }
              />
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
