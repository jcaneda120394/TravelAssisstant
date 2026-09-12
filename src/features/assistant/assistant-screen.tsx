import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { LocationPickerModal } from '@/components/location/location-picker-modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, TextInput, View } from '@/components/ui/primitives';
import { providers } from '@/providers/registry';
import type { AIMessage } from '@/types/domain';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { useLocationStore } from '@/stores/location-store';
import { analytics } from '@/lib/analytics';
import { looksLikeSanFrancisco } from '@/services/location/location.service';
import { getErrorMessage } from '@/lib/errors/app-error';

const MODES = ['ask', 'explore', 'planner', 'navigator', 'emergency', 'budget'] as const;

export function AssistantScreen() {
  const scheme = useAppColorScheme();
  const { user, preferences, profile } = useAuth();
  const location = useLocationStore();
  const [input, setInput] = useState('What should we do this afternoon?');
  const [mode, setMode] = useState<(typeof MODES)[number]>('ask');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locationLabel = location.label ?? 'No city set';
  const stuckOnSf = looksLikeSanFrancisco(location.coords);

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi — I use live tools for places, weather, and routes near your selected city. Set your location on Home (or below) so afternoon plans match where you are.',
      createdAt: new Date().toISOString(),
    },
  ]);

  const chatMutation = useMutation({
    mutationFn: async () => {
      if (!location.coords) {
        throw new Error('Set your location first (Choose city) so I can search nearby places.');
      }
      const userMessage: AIMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: input.trim(),
        createdAt: new Date().toISOString(),
      };
      const nextMessages = [...messages, userMessage];
      analytics.track('ai_message_sent', { mode, city: location.city });
      const response = await providers.ai.chat({
        messages: nextMessages,
        mode,
        context: {
          userId: user?.id,
          city: location.city,
          country: location.country,
          label: location.label,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          preferences,
          profileName: profile?.full_name,
        },
      });
      return { userMessage, assistantMessage: response.message };
    },
    onSuccess: ({ userMessage, assistantMessage }) => {
      setError(null);
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <Screen>
      <ScrollView
        className="flex-1 px-5 pt-14"
        contentContainerClassName="pb-10"
        testID="screen-assistant"
      >
        <SectionHeader
          title="AI Assistant"
          subtitle={`Near ${locationLabel} · ${providers.ai.name}`}
        />

        <Card className="mb-4">
          <AppText className="font-sans-semibold">Planning location</AppText>
          <AppText muted className="mt-1">
            {locationLabel}
            {location.coords
              ? ` · ${location.coords.latitude.toFixed(3)}, ${location.coords.longitude.toFixed(3)}`
              : ''}
          </AppText>
          {stuckOnSf ? (
            <AppText className="mt-2 text-sm text-accent-600">
              Simulator GPS is San Francisco — choose Bulacan/Manila for Philippines results.
            </AppText>
          ) : null}
          <View className="mt-3">
            <Button label="Choose city" variant="secondary" onPress={() => setPickerOpen(true)} />
          </View>
        </Card>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {MODES.map((item) => (
              <Button
                key={item}
                label={item}
                variant={item === mode ? 'primary' : 'secondary'}
                onPress={() => setMode(item)}
              />
            ))}
          </View>
        </ScrollView>

        <View className="mb-4 gap-3">
          {messages.map((message) => (
            <Card key={message.id} className={message.role === 'user' ? 'border-brand-300' : ''}>
              <AppText className="mb-1 text-xs font-sans-medium uppercase text-brand-500">
                {message.role}
              </AppText>
              <AppText>{message.content}</AppText>
            </Card>
          ))}
          {chatMutation.isPending ? <Skeleton height={72} /> : null}
          {error ? <AppText className="text-sm text-red-500">{error}</AppText> : null}
        </View>

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything about your trip"
          placeholderTextColor={scheme === 'dark' ? '#9BB0AC' : '#5B6F6C'}
          multiline
          className={`mb-3 min-h-[88px] rounded-2xl border px-4 py-3 font-sans ${
            scheme === 'dark'
              ? 'border-brand-800 bg-surface-cardDark text-ink-dark'
              : 'border-brand-100 bg-white text-ink-light'
          }`}
          testID="assistant-input"
        />

        <Button
          label="Send"
          testID="assistant-send"
          loading={chatMutation.isPending}
          disabled={!input.trim()}
          onPress={() => chatMutation.mutate()}
        />
      </ScrollView>

      <LocationPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </Screen>
  );
}
