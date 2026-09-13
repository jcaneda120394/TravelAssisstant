import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { getErrorMessage } from '@/lib/errors/app-error';
import { acceptTripInvite } from '@/services/trips/trips.service';

export default function InviteAcceptRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const onAccept = async () => {
    if (!token || typeof token !== 'string') {
      Alert.alert('Invalid invite', 'This invite link is missing a token.');
      return;
    }
    if (!user) {
      Alert.alert('Sign in required', 'Sign in with the invited email, then open this link again.', [
        { text: 'Sign in', onPress: () => router.push('/(auth)/login') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    setLoading(true);
    try {
      const member = await acceptTripInvite(token);
      Alert.alert('Invite accepted', `You joined as ${member.role}.`);
      router.replace(`/trip/${member.tripId}`);
    } catch (error) {
      Alert.alert('Unable to accept invite', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View className="flex-1 px-5 pt-6">
        <SectionHeader
          title="Trip invitation"
          subtitle="Accept a secure invite to collaborate on a trip"
        />
        <Card className="mb-4">
          <AppText muted className="mb-4">
            Invites expire after 14 days, can be revoked by the trip owner, and become invalid after
            you accept them.
          </AppText>
          {!user ? (
            <AppText className="mb-4">
              Sign in with the email that received this invite before accepting.
            </AppText>
          ) : (
            <AppText className="mb-4">Signed in as {user.email ?? 'your account'}.</AppText>
          )}
          <Button
            label={user ? 'Accept invite' : 'Sign in to accept'}
            loading={loading}
            onPress={() => {
              if (!user) {
                router.push('/(auth)/login');
                return;
              }
              void onAccept();
            }}
          />
          <View className="mt-3">
            <Button label="Back" variant="secondary" onPress={() => router.back()} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}
