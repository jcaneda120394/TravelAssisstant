import * as Clipboard from 'expo-clipboard';
import * as Speech from 'expo-speech';
import { useMemo, useState } from 'react';
import { Alert, Image, Platform } from 'react-native';

import { ChipSelect } from '@/components/forms/chip-select';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView, View } from '@/components/ui/primitives';
import { LANGUAGES } from '@/constants/preferences';
import { useAuth } from '@/hooks/use-auth';
import { getErrorMessage } from '@/lib/errors/app-error';
import {
  pickScanImage,
  translatePlainText,
  translateScannedImage,
  type ScanTranslateResult,
} from '@/services/translate/scan-translate.service';

const TARGET_CODES = LANGUAGES.map((lang) => lang.code);

export function TranslateScreen() {
  const { preferences } = useAuth();
  const preferred = preferences?.preferred_language || 'en';
  const [targetLang, setTargetLang] = useState(preferred);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanTranslateResult | null>(null);

  const targetLabel = useMemo(
    () => LANGUAGES.find((lang) => lang.code === targetLang)?.label ?? targetLang,
    [targetLang],
  );

  const runScan = async (source: 'camera' | 'library') => {
    try {
      setBusy(true);
      const picked = await pickScanImage(source);
      if (!picked) return;
      setImageUri(picked.uri);
      setResult(null);
      const next = await translateScannedImage({
        uri: picked.uri,
        base64: picked.base64,
        targetLang,
      });
      setResult(next);
      if (!next.originalText && !next.translatedText) {
        Alert.alert('No text found', 'Try a clearer photo of the menu or sign.');
      }
    } catch (error) {
      Alert.alert('Scan translate', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const runText = async () => {
    try {
      setBusy(true);
      setImageUri(null);
      const next = await translatePlainText({ text: manualText, targetLang });
      setResult(next);
    } catch (error) {
      Alert.alert('Translate', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const copyTranslation = async () => {
    if (!result?.translatedText) return;
    await Clipboard.setStringAsync(result.translatedText);
    if (Platform.OS === 'web') {
      window.alert('Copied translation');
      return;
    }
    Alert.alert('Copied', 'Translation copied to clipboard.');
  };

  const speakTranslation = () => {
    if (!result?.translatedText) return;
    Speech.stop();
    Speech.speak(result.translatedText, { language: targetLang.split('-')[0] });
  };

  return (
    <Screen>
      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerClassName="pb-12"
        testID="screen-translate"
      >
        <SectionHeader
          eyebrow="Traveler tool"
          title="Scan & translate"
          subtitle="Point at a menu, sign, or label — we translate it for you. Nothing is saved."
        />

        <AppText className="mb-2 font-sans-medium">Translate to</AppText>
        <ChipSelect
          options={TARGET_CODES}
          values={[targetLang]}
          multiple={false}
          labels={Object.fromEntries(LANGUAGES.map((lang) => [lang.code, lang.label]))}
          onChange={(values) => setTargetLang(values[0] ?? 'en')}
        />

        <Card className="mb-4 mt-4">
          <AppText className="mb-3 font-sans-semibold">Scan anything</AppText>
          <AppText muted className="mb-4 text-sm leading-5">
            Take a photo or choose one from your library. Best with clear lighting and readable text.
          </AppText>
          <View className="gap-2">
            <Button
              label="Scan with camera"
              loading={busy}
              onPress={() => void runScan('camera')}
              testID="translate-camera"
            />
            <Button
              label="Choose photo"
              variant="secondary"
              loading={busy}
              onPress={() => void runScan('library')}
              testID="translate-library"
            />
          </View>
        </Card>

        {imageUri ? (
          <View className="mb-4 overflow-hidden rounded-2xl">
            <Image
              source={{ uri: imageUri }}
              style={{ width: '100%', height: 220 }}
              resizeMode="cover"
              accessibilityLabel="Scanned image"
            />
          </View>
        ) : null}

        <Card className="mb-4">
          <AppText className="mb-3 font-sans-semibold">Or type / paste text</AppText>
          <TextField
            label="Text to translate"
            value={manualText}
            onChangeText={setManualText}
            placeholder="Paste menu items or a sign…"
            multiline
            testID="translate-text"
          />
          <Button
            label={`Translate to ${targetLabel}`}
            variant="secondary"
            loading={busy}
            onPress={() => void runText()}
            testID="translate-text-submit"
          />
        </Card>

        {result ? (
          <Card className="mb-4">
            <AppText muted className="mb-1 text-xs font-sans-semibold uppercase tracking-wide">
              Original
              {result.detectedLanguage ? ` · ${result.detectedLanguage}` : ''}
            </AppText>
            <AppText className="mb-4 text-[15px] leading-6">
              {result.originalText || '—'}
            </AppText>

            <AppText muted className="mb-1 text-xs font-sans-semibold uppercase tracking-wide">
              Translation · {targetLabel}
            </AppText>
            <AppText className="mb-4 text-[16px] font-sans-semibold leading-6">
              {result.translatedText || '—'}
            </AppText>

            <View className="gap-2">
              <Button label="Copy translation" variant="secondary" onPress={() => void copyTranslation()} />
              <Button label="Read aloud" variant="ghost" onPress={speakTranslation} />
              <Button
                label="Clear"
                variant="ghost"
                onPress={() => {
                  setResult(null);
                  setImageUri(null);
                  setManualText('');
                }}
              />
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
