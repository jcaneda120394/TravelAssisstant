import { useQuery } from '@tanstack/react-query';

import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { getErrorMessage } from '@/lib/errors/app-error';
import { fetchAdminOverview } from '@/services/admin/admin.service';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="mb-0 min-w-[160px] flex-1">
      <AppText muted className="text-xs font-sans-semibold uppercase tracking-wide">
        {label}
      </AppText>
      <AppText className="mt-2 font-display-bold text-3xl">{value}</AppText>
    </Card>
  );
}

export default function AdminOverviewScreen() {
  const query = useQuery({
    queryKey: ['admin-overview'],
    queryFn: fetchAdminOverview,
  });

  const data = query.data;

  return (
    <Screen testID="admin-overview">
      <ScrollView className="flex-1 px-6 py-6" contentContainerClassName="pb-12">
        <SectionHeader
          eyebrow="Dashboard"
          title="Overview"
          subtitle="Live counts from your Supabase project"
        />
        {query.isError ? (
          <Card className="mb-4">
            <AppText className="text-red-500">{getErrorMessage(query.error)}</AppText>
          </Card>
        ) : null}
        <View className="flex-row flex-wrap gap-3">
          <StatCard label="Users" value={data?.users ?? 0} />
          <StatCard label="Admins" value={data?.admins ?? 0} />
          <StatCard label="Trips" value={data?.trips ?? 0} />
          <StatCard label="Public trips" value={data?.publicTrips ?? 0} />
          <StatCard label="Reviews" value={data?.reviews ?? 0} />
          <StatCard label="Public reviews" value={data?.publicReviews ?? 0} />
          <StatCard label="Photos" value={data?.photos ?? 0} />
        </View>
      </ScrollView>
    </Screen>
  );
}
