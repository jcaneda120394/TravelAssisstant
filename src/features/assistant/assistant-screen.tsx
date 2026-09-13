import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LocationPickerModal } from '@/components/location/location-picker-modal';
import { Skeleton } from '@/components/feedback/skeleton';
import { AppText, Screen } from '@/components/ui/typography';
import { TextInput, View } from '@/components/ui/primitives';
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

const SUGGESTIONS = [
  'Best restaurants near me',
  'Things to do nearby today',
  'Help plan my trip in this area',
  'How do I get around here?',
] as const;

function firstParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[value.length - 1] : value;
  return raw?.trim() || '';
}

function MessageBubble({
  message,
  onSpeak,
  primaryColor,
}: {
  message: AIMessage;
  onSpeak?: () => void;
  primaryColor: string;
}) {
  const scheme = useAppColorScheme();
  const isUser = message.role === 'user';

  return (
    <View className={`mb-3 max-w-[92%] ${isUser ? 'self-end' : 'self-start'}`}>
      <View
        className={`rounded-3xl px-4 py-3 ${
          isUser
            ? 'rounded-br-lg bg-brand-600'
            : scheme === 'dark'
              ? 'rounded-bl-lg border border-brand-800 bg-surface-cardDark'
              : 'rounded-bl-lg border border-black/8 bg-white'
        }`}
      >
        {!isUser ? (
          <View className="mb-1.5 flex-row items-center justify-between gap-2">
            <AppText className="text-[11px] font-sans-semibold uppercase tracking-wide text-brand-500">
              TravelAssistant
            </AppText>
            {onSpeak ? (
              <RNPressable
                onPress={onSpeak}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Speak reply"
              >
                <Ionicons name="volume-high-outline" size={16} color={primaryColor} />
              </RNPressable>
            ) : null}
          </View>
        ) : null}
        <AppText className={isUser ? 'text-white' : ''} inverse={isUser}>
          {message.content}
        </AppText>
      </View>
    </View>
  );
}

export function AssistantScreen() {
  const scheme = useAppColorScheme();
  const insets = useSafeAreaInsets();
  const { colors } = useCountryAppearance();
  const { user, preferences, profile } = useAuth();
  const location = useLocationStore();
  const params = useLocalSearchParams<{ prompt?: string | string[] }>();
  const promptFromFab = firstParam(params.prompt);
  const [input, setInput] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const listRef = useRef<RNScrollView>(null);
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
        'Ask me anything about places, food, hotels, routes, weather, or your trips near your current location. I only answer TravelAssistant questions for the area around you.',
      createdAt: new Date().toISOString(),
    },
  ]);

  const chatMutation = useMutation({
    mutationFn: async (prompt?: string) => {
      const question = (prompt ?? input).trim();
      if (!location.coords) {
        throw new Error('Set your location first so I can search nearby places.');
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
      analytics.track('ai_message_sent', {
        mode: 'ask',
        city: location.city,
        voice: Boolean(prompt),
      });
      const response = await providers.ai.chat({
        messages: nextMessages,
        mode: 'ask',
        context: {
          userId: user?.id,
          city: location.city,
          country: location.country,
          label: location.label,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          preferences,
          profileName: profile?.full_name,
          scope: 'nearby_and_app_only',
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
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const send = (prompt?: string) => {
    setError(null);
    voice.stopListening();
    voice.stopSpeaking();
    chatMutation.mutate(prompt);
  };

  const showSuggestions = messages.length <= 1 && !chatMutation.isPending;

  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        testID="screen-assistant"
      >
        <View className="border-b border-black/8 px-5 pb-3 pt-2 dark:border-brand-800">
          <AppText className="font-sans-bold text-xl">Chat</AppText>
          <RNPressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Change planning location"
            className="mt-2 self-start rounded-full border border-brand-300 px-3 py-1.5 dark:border-brand-700"
          >
            <AppText className="text-sm text-brand-700 dark:text-brand-200">
              Near {locationLabel} · tap to change
            </AppText>
          </RNPressable>
          {stuckOnSf ? (
            <AppText className="mt-2 text-xs text-accent-600">
              Simulator GPS looks like San Francisco — choose your real city for nearby results.
            </AppText>
          ) : null}
        </View>

        <RNScrollView
          ref={listRef}
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              primaryColor={colors.primary}
              onSpeak={
                message.role === 'assistant' ? () => voice.speak(message.content) : undefined
              }
            />
          ))}
          {chatMutation.isPending ? <Skeleton height={64} /> : null}
          {error ? <AppText className="mb-2 text-sm text-red-500">{error}</AppText> : null}

          {showSuggestions ? (
            <View className="mt-2 gap-2">
              <AppText muted className="text-xs">
                Try a nearby question
              </AppText>
              <View className="flex-row flex-wrap gap-2">
                {SUGGESTIONS.map((label) => (
                  <RNPressable
                    key={label}
                    onPress={() => {
                      if (!location.coords) {
                        setPickerOpen(true);
                        return;
                      }
                      setInput(label);
                      send(label);
                    }}
                    className={`rounded-full border px-3 py-2 ${
                      scheme === 'dark' ? 'border-brand-700' : 'border-brand-200'
                    }`}
                  >
                    <AppText className="text-sm">{label}</AppText>
                  </RNPressable>
                ))}
              </View>
            </View>
          ) : null}
        </RNScrollView>

        <View
          className={`border-t px-3 pt-2 dark:border-brand-800 ${
            scheme === 'dark' ? 'border-brand-800 bg-surface-dark' : 'border-black/8 bg-surface-light'
          }`}
          style={{ paddingBottom: Math.max(insets.bottom, 10) }}
        >
          <AppText muted className="mb-2 px-1 text-[11px]">
            Nearby places + TravelAssistant only · not a general chatbot
          </AppText>
          <View
            className={`rounded-3xl border px-3 py-2 ${
              scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-black/8 bg-white'
            }`}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={
                location.coords
                  ? 'Message TravelAssistant…'
                  : 'Choose a city first, then ask nearby…'
              }
              placeholderTextColor={scheme === 'dark' ? '#9BB0AC' : '#5B6F6C'}
              multiline
              className={`max-h-32 min-h-[44px] font-sans text-base ${
                scheme === 'dark' ? 'text-ink-dark' : 'text-ink-light'
              }`}
              testID="assistant-input"
              onSubmitEditing={() => {
                if (input.trim() && location.coords && !chatMutation.isPending) send();
              }}
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
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: voice.listening ? colors.accent : colors.primary,
                }}
              >
                <Ionicons name={voice.listening ? 'stop' : 'mic'} size={20} color="#FFFFFF" />
              </RNPressable>
              <RNPressable
                accessibilityRole="button"
                accessibilityLabel={voiceReplies ? 'Mute spoken replies' : 'Enable spoken replies'}
                onPress={() => {
                  if (voiceReplies) voice.stopSpeaking();
                  setVoiceReplies((prev) => !prev);
                }}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: scheme === 'dark' ? '#1A2E2B' : '#F7FAF9',
                }}
              >
                <Ionicons
                  name={voiceReplies ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
                  size={18}
                  color={voiceReplies ? colors.accent : colors.textMuted}
                />
              </RNPressable>
              <View className="flex-1" />
              <RNPressable
                testID="assistant-send"
                accessibilityRole="button"
                accessibilityLabel="Send message"
                disabled={!input.trim() || !location.coords || chatMutation.isPending}
                onPress={() => send()}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: !input.trim() || !location.coords || chatMutation.isPending ? 0.45 : 1,
                  backgroundColor: colors.primary,
                }}
              >
                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
              </RNPressable>
            </View>
          </View>
          {!location.coords ? (
            <RNPressable onPress={() => setPickerOpen(true)} className="mt-2 px-1">
              <AppText className="text-sm text-accent-600">
                Choose a city so I can search near you.
              </AppText>
            </RNPressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      <LocationPickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} />
    </Screen>
  );
}
