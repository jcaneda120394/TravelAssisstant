import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Speech from 'expo-speech';

type Options = {
  onTranscript?: (text: string, isFinal: boolean) => void;
  lang?: string;
};

type SpeechRecognitionModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  addListener: (
    event: string,
    listener: (payload: Record<string, unknown>) => void,
  ) => { remove: () => void };
};

/**
 * Never `require('expo-speech-recognition')` inside Expo Go — loading the package
 * calls requireNativeModule and redboxes even when wrapped in try/catch.
 */
function loadSpeechRecognition(): SpeechRecognitionModule | null {
  // Expo Go / store client without a custom native binary.
  if (Constants.appOwnership === 'expo') {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-speech-recognition') as {
      ExpoSpeechRecognitionModule?: SpeechRecognitionModule;
    };
    const api = mod.ExpoSpeechRecognitionModule;
    if (!api?.isRecognitionAvailable || !api?.start) {
      return null;
    }
    api.isRecognitionAvailable();
    return api;
  } catch {
    return null;
  }
}

let speechRecognition: SpeechRecognitionModule | null | undefined;

function getSpeechRecognition(): SpeechRecognitionModule | null {
  if (speechRecognition === undefined) {
    speechRecognition = loadSpeechRecognition();
  }
  return speechRecognition;
}

/**
 * Voice input (speech-to-text) + spoken replies (text-to-speech) for the AI assistant.
 * STT needs a development/production native build; TTS works in Expo Go via expo-speech.
 */
export function useAssistantVoice(options: Options = {}) {
  const { onTranscript, lang = 'en-US' } = options;
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [partial, setPartial] = useState('');
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    const api = getSpeechRecognition();
    try {
      setSupported(Boolean(api?.isRecognitionAvailable?.()));
    } catch {
      setSupported(false);
    }
  }, []);

  useEffect(() => {
    const api = getSpeechRecognition();
    if (!api?.addListener) {
      return;
    }

    const startSub = api.addListener('start', () => {
      setListening(true);
      setPartial('');
    });
    const endSub = api.addListener('end', () => {
      setListening(false);
    });
    const resultSub = api.addListener('result', (event) => {
      const results = event.results as Array<{ transcript?: string }> | undefined;
      const transcript = results?.[0]?.transcript?.trim() ?? '';
      if (!transcript) return;
      setPartial(transcript);
      onTranscriptRef.current?.(transcript, Boolean(event.isFinal));
    });
    const errorSub = api.addListener('error', (event) => {
      setListening(false);
      const code = String(event.error ?? '');
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        Alert.alert(
          'Microphone needed',
          'Allow microphone and speech recognition to ask travel questions by voice.',
        );
      }
    });

    return () => {
      startSub.remove();
      endSub.remove();
      resultSub.remove();
      errorSub.remove();
    };
  }, []);

  const stopListening = useCallback(() => {
    try {
      getSpeechRecognition()?.stop();
    } catch {
      // ignore
    }
    setListening(false);
  }, []);

  const startListening = useCallback(async () => {
    const api = getSpeechRecognition();
    if (!api) {
      Alert.alert(
        'Voice input needs a native build',
        Platform.OS === 'web'
          ? 'Speech recognition is limited on web. Type your travel question instead.'
          : 'Expo Go cannot use mic speech-to-text. Type your question, or run a development build (npx expo run:ios) for voice input. Spoken replies still work.',
      );
      return;
    }

    try {
      const permissions = await api.requestPermissionsAsync();
      if (!permissions.granted) {
        Alert.alert(
          'Permission required',
          'Microphone and speech recognition are needed for voice questions.',
        );
        return;
      }
      setPartial('');
      api.start({
        lang,
        interimResults: true,
        continuous: false,
        addsPunctuation: true,
      });
    } catch (error) {
      Alert.alert(
        'Voice unavailable',
        error instanceof Error
          ? error.message
          : 'Speech recognition is not available on this device/build.',
      );
    }
  }, [lang]);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
      return;
    }
    void startListening();
  }, [listening, startListening, stopListening]);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      const cleaned = text.replace(/\s+/g, ' ').trim();
      if (!cleaned) return;
      stopSpeaking();
      setSpeaking(true);
      Speech.speak(cleaned.slice(0, 1200), {
        language: lang,
        rate: 0.96,
        onDone: () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError: () => setSpeaking(false),
      });
    },
    [lang, stopSpeaking],
  );

  useEffect(() => {
    return () => {
      try {
        getSpeechRecognition()?.abort();
      } catch {
        // ignore
      }
      Speech.stop();
    };
  }, []);

  return {
    supported,
    listening,
    speaking,
    partial,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
  };
}
