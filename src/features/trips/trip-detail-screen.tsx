import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import {
  addItineraryItem,
  listItinerary,
  optimizeItineraryDay,
  removeItineraryItem,
} from '@/services/itinerary/itinerary.service';
import { getTrip, inviteTripMember } from '@/services/trips/trips.service';
import { getBudget, listExpenses, summarizeExpenses, upsertBudget } from '@/services/budget/budget.service';
import { getErrorMessage } from '@/lib/errors/app-error';
import { Skeleton } from '@/components/feedback/skeleton';

export function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, preferences } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [activityTitle, setActivityTitle] = useState('Museum visit');
  const day = new Date().toISOString().slice(0, 10);

  const tripQuery = useQuery({
    queryKey: ['trip', id],
    enabled: Boolean(id),
    queryFn: () => getTrip(String(id)),
  });

  const itineraryQuery = useQuery({
    queryKey: ['itinerary', id, day],
    enabled: Boolean(id),
    queryFn: () => listItinerary(String(id), day),
  });

  const budgetQuery = useQuery({
    queryKey: ['budget', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const budget = await getBudget(String(id));
      const expenses = await listExpenses(String(id));
      return { budget, expenses, summary: summarizeExpenses(expenses, budget) };
    },
  });

  const addItem = useMutation({
    mutationFn: async () =>
      addItineraryItem({
        tripId: String(id),
        day,
        startTime: '10:00',
        endTime: '12:00',
        title: activityTitle,
        estimatedCost: 20,
        currency: preferences?.home_currency ?? 'USD',
        notes: 'Added from trip dashboard',
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['itinerary', id] }),
    onError: (error) => Alert.alert('Failed', getErrorMessage(error)),
  });

  const optimize = useMutation({
    mutationFn: () => optimizeItineraryDay(String(id), day),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['itinerary', id] }),
  });

  const invite = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('Sign in required');
      }
      return inviteTripMember({
        tripId: String(id),
        email: inviteEmail,
        role: 'editor',
        invitedByUserId: user.id,
      });
    },
    onSuccess: () => {
      setInviteEmail('');
      Alert.alert('Invite saved', 'Collaboration invite stored locally (Phase 17).');
    },
    onError: (error) => Alert.alert('Invite failed', getErrorMessage(error)),
  });

  const ensureBudget = useMutation({
    mutationFn: () =>
      upsertBudget({
        tripId: String(id),
        total: 2000,
        currency: preferences?.home_currency ?? 'USD',
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['budget', id] }),
  });

  if (tripQuery.isLoading) {
    return (
      <Screen className="px-5 pt-14">
        <Skeleton height={160} />
      </Screen>
    );
  }

  if (!tripQuery.data) {
    return (
      <Screen className="px-5 pt-14">
        <EmptyState title="Trip not found" description="Create a trip from the Trips tab." />
        <Button label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const trip = tripQuery.data;
  const summary = budgetQuery.data?.summary;

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-12" testID="screen-trip">
        <SectionHeader
          title={trip.title}
          subtitle={`${trip.startDate} → ${trip.endDate} · ${trip.destinations.join(', ')}`}
        />

        <Card className="mb-4">
          <AppText muted>
            Travelers: {trip.adults} adults, {trip.children} children
          </AppText>
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1">
              <Button label="Budget" variant="secondary" onPress={() => router.push({
                pathname: '/budget',
                params: { tripId: trip.id },
              })} />
            </View>
            <View className="flex-1">
              <Button label="Map day" variant="secondary" onPress={() => router.push('/map')} />
            </View>
          </View>
        </Card>

        <Card className="mb-4">
          <SectionHeader title={`Itinerary · ${day}`} />
          <TextField
            label="Activity title"
            value={activityTitle}
            onChangeText={setActivityTitle}
            autoCapitalize="sentences"
          />
          <View className="mb-3 flex-row gap-2">
            <View className="flex-1">
              <Button label="Add item" loading={addItem.isPending} onPress={() => addItem.mutate()} />
            </View>
            <View className="flex-1">
              <Button
                label="Optimize"
                variant="secondary"
                loading={optimize.isPending}
                onPress={() => optimize.mutate()}
              />
            </View>
          </View>
          {itineraryQuery.data?.map((item) => (
            <View key={item.id} className="mb-3 rounded-xl border border-brand-100 p-3 dark:border-brand-800">
              <AppText className="font-sans-semibold">
                {item.startTime}–{item.endTime} · {item.title}
              </AppText>
              {item.transportSummary ? (
                <AppText muted className="mt-1 text-sm">{item.transportSummary}</AppText>
              ) : null}
              <View className="mt-2">
                <Button
                  label="Remove"
                  variant="ghost"
                  onPress={() =>
                    void removeItineraryItem(item.id).then(() =>
                      queryClient.invalidateQueries({ queryKey: ['itinerary', id] }),
                    )
                  }
                />
              </View>
            </View>
          ))}
          {(itineraryQuery.data?.length ?? 0) === 0 ? (
            <AppText muted>No activities yet for today.</AppText>
          ) : null}
        </Card>

        <Card className="mb-4">
          <SectionHeader title="Budget snapshot" />
          <AppText muted>
            Spent: {summary?.spent?.toFixed(2) ?? '0'} · Remaining:{' '}
            {summary?.remaining == null ? 'Set a budget' : summary.remaining.toFixed(2)}
          </AppText>
          <View className="mt-3">
            <Button
              label="Set $2000 budget"
              variant="secondary"
              loading={ensureBudget.isPending}
              onPress={() => ensureBudget.mutate()}
            />
          </View>
        </Card>

        <Card>
          <SectionHeader title="Collaborate" subtitle="Invite partner/family/friends" />
          <TextField
            label="Invite email"
            value={inviteEmail}
            onChangeText={setInviteEmail}
            keyboardType="email-address"
          />
          <Button
            label="Send invite"
            loading={invite.isPending}
            disabled={!inviteEmail.includes('@')}
            onPress={() => invite.mutate()}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
