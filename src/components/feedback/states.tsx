import { AppText, Card } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <View className="gap-2">
        <AppText className="font-sans-semibold text-lg">{title}</AppText>
        <AppText muted>{description}</AppText>
      </View>
    </Card>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <Card className="border-red-300">
      <View className="gap-2">
        <AppText className="font-sans-semibold text-lg">{title}</AppText>
        <AppText muted>{description}</AppText>
      </View>
    </Card>
  );
}
