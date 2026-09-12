import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable as RNPressable } from 'react-native';

import { LocationPickerModal } from '@/components/location/location-picker-modal';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, TextInput, View } from '@/components/ui/primitives';
import { providers } from '@/providers/registry';
import type { AIMessage } from '@/types/domain';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useAssistantVoice } from '@/hooks/use-assistant-voice';
import { useAuth } from '@/hooks/use-auth';
import { useCountryAppearance } from '@/hooks/use-country-appearance';
import { useLocationStore } from '@/stores/location-store';
import { analytics } from '@/lib/analytics';
import { looksLikeSanFrancisco } from '@/services/location/location.service';
import { evaluateTravelScope } from '@/services/ai/travel-scope';
import { getErrorMessage } from '@/lib/errors/app-error';

const MODES = ['ask', 'explore', 'planner', 'navigator', 'emergency', 'budget'] as const;

function firstParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[value.length - 1] : value;
  return raw?.trim() || '';
}

export function AssistantScreen() {
  const scheme = useAppColorScheme();
  const { colors } = useCountryAppearance();
  const { user, preferences, profile } = useAuth();
  const location = useLocationStore();
  const params = useLocalSearchParams<{ prompt?: string | string[] }>();
  const promptFromFab = firstParam(params.prompt);
  const [input, setInput] = useState(promptFromFab || 'What should we do this afternoon?');
  const [mode, setMode] = useState<(typeof MODES)[number]>('ask');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const locationLabel = location.label ?? 'No city set';
  const stuckOnSf = looksLikeSanFrancisco(location.coords) && location.mode !== 'manual';

  const onTranscript = useCallback((text: string, isFinal: boolean) => {
    setInput(text);
    if (isFinal) {
      setError(null);
    }
  }, []);

  const voice = useAssistantVoice({ onTranscript });

  useEffect(() => {
    if (promptFromFab === '__voice__') {
      setInput('');
      voice.startListening();
      return;
    }
    if (promptFromFab) {
      setInput(promptFromFab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start voice once when opened from FAB
  }, [promptFromFab]);

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hi — ask by text or voice about places, restaurants, hotels, routes, weather, and trip plans near your city. Off-topic questions are declined.',
      createdAt: new Date().toISOString(),
    },
  ]);

  const chatMutation = useMutation({
    mutationFn: async (prompt?: string) => {
      const question = (prompt ?? input).trim();
      if (!location.coords) {
        throw new Error('Set your location first (Choose city) so I can search nearby places.');
      }
      const scope = evaluateTravelScope(question);
      if (!scope.ok) {
        const rejection: AIMessage = {
          id: `reject_${Date.now()}`,
          role: 'assistant',
          content: scope.rejectionMessage,
          createdAt: new Date().toISOString(),
        };
        const userMessage: AIMessage = {
          id: `user_${Date.now()}`,
          role: 'user',
          content: question,
          createdAt: new Date().toISOString(),
        };
        return { userMessage, assistantMessage: rejection, rejected: true as const };
      }

      const userMessage: AIMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: question,
        createdAt: new Date().toISOString(),
      };
      const nextMessages = [...messages, userMessage];
      analytics.track('ai_message_sent', { mode, city: location.city, voice: Boolean(prompt) });
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
      return { userMessage, assistantMessage: response.message, rejected: false as const };
    },
    onSuccess: ({ userMessage, assistantMessage }) => {
      setError(null);
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setInput('');
      if (voiceReplies) {
        voice.speak(assistantMessage.content);
      }
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const send = (prompt?: string) => {
    setError(null);
    voice.stopListening();
    voice.stopSpeaking();
    chatMutation.mutate(prompt);
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerClassName="pb-10"
        testID="screen-assistant"
      >
        <SectionHeader
          title="AI Assistant"
          subtitle={`Near ${locationLabel} · travel questions only · ${providers.ai.name}`}
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
              <View className="mb-1 flex-row items-center justify-between gap-2">
                <AppText className="text-xs font-sans-medium uppercase text-brand-500">
                  {message.role}
                </AppText>
                {message.role === 'assistant' ? (
                  <RNPressable
                    onPress={() => voice.speak(message.content)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Speak reply"
                  >
                    <Ionicons name="volume-high-outline" size={18} color={colors.primary} />
                  </RNPressable>
                ) : null}
              </View>
              <AppText>{message.content}</AppText>
            </Card>
          ))}
          {chatMutation.isPending ? <Skeleton height={72} /> : null}
          {error ? <AppText className="text-sm text-red-500">{error}</AppText> : null}
        </View>

        <AppText muted className="mb-2 text-xs">
          Scope: places, restaurants, hotels, routes, weather, budget, and trip planning only.
        </AppText>

        <View
          className={`mb-3 rounded-2xl border px-3 py-2 ${
            scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-brand-100 bg-white'
          }`}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask or tap the mic — travel questions only"
            placeholderTextColor={scheme === 'dark' ? '#9BB0AC' : '#5B6F6C'}
            multiline
            className={`min-h-[72px] font-sans text-base ${
              scheme === 'dark' ? 'text-ink-dark' : 'text-ink-light'
            }`}
            testID="assistant-input"
          />
          {voice.listening || voice.partial ? (
            <AppText muted className="mt-1 text-xs">
              {voice.listening ? 'Listening… ' : ''}
              {voice.partial}
            </AppText>
          ) : null}
          <View className="mt-2 flex-row items-center gap-2">
            <RNPressable
              testID="assistant-voice"
              accessibilityRole="button"
              accessibilityLabel={voice.listening ? 'Stop listening' : 'Ask with voice'}
              onPress={() => {
                if (!voice.supported) {
                  setError('Voice input is unavailable on this build. Use text for now.');
                  return;
                }
                voice.toggleListening();
              }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: voice.listening ? colors.accent : colors.primary,
              }}
            >
              <Ionicons name={voice.listening ? 'stop' : 'mic'} size={22} color="#FFFFFF" />
            </RNPressable>
            <View className="flex-1">
              <Button
                label="Send"
                testID="assistant-send"
                loading={chatMutation.isPending}
                disabled={!input.trim() || !location.coords}
                onPress={() => send()}
              />
            </View>
            <RNPressable
              accessibilityRole="button"
              accessibilityLabel={voiceReplies ? 'Mute spoken replies' : 'Enable spoken replies'}
              onPress={() => {
                if (voiceReplies) voice.stopSpeaking();
                setVoiceReplies((prev) => !prev);
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: scheme === 'dark' ? '#1A2E2B' : '#EEF6F4',
              }}
            >
              <Ionicons
                name={voiceReplies ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                size={20}
                color={voiceReplies ? colors.accent : colors.textMuted}
              />
            </RNPressable>
          </View>
        </View>

        {voice.listening && input.trim() && location.coords ? (
          <Button
            label="Send voice question"
            variant="accent"
            onPress={() => send(input)}
            disabled={chatMutation.isPending}
          />
        ) : null}

        {!location.coords ? (
          <AppText className="mt-2 text-sm text-accent-600">
            Choose a city first so I can search nearby places.
          </AppText>
        ) : null}
      </ScrollView>

      <LocationPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </Screen>
  );
}
