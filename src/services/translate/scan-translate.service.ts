import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { env } from '@/config/env';
import { AppError, toAppError } from '@/lib/errors/app-error';
import { assertSupabase, supabase } from '@/lib/supabase/client';

export type ScanTranslateResult = {
  originalText: string;
  translatedText: string;
  detectedLanguage?: string;
  provider?: string;
};

async function uriToBase64(
  uri: string,
  fallbackBase64?: string | null,
): Promise<{ base64: string; mimeType: string }> {
  const mimeType = uri.toLowerCase().includes('.png')
    ? 'image/png'
    : uri.toLowerCase().includes('.webp')
      ? 'image/webp'
      : 'image/jpeg';

  if (fallbackBase64) {
    return { base64: fallbackBase64, mimeType };
  }

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result ?? '');
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(new Error('Could not read image'));
      reader.readAsDataURL(blob);
    });
    return { base64, mimeType: blob.type || mimeType };
  }

  const FileSystem = await import('expo-file-system');
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { base64, mimeType };
}

async function callScanTranslate(body: Record<string, unknown>): Promise<ScanTranslateResult> {
  if (!env.isSupabaseConfigured || !supabase) {
    throw new AppError('Translate needs a live connection. Check your network and try again.', {
      code: 'NO_SUPABASE',
    });
  }

  const client = assertSupabase();
  const { data, error } = await client.functions.invoke<{
    originalText?: string;
    translatedText?: string;
    detectedLanguage?: string;
    provider?: string;
    error?: string;
  }>('scan-translate', { body });

  if (error) {
    throw toAppError(error, 'Could not translate that scan');
  }
  if (data?.error) {
    throw new AppError(data.error, { code: 'SCAN_TRANSLATE' });
  }

  return {
    originalText: String(data?.originalText ?? ''),
    translatedText: String(data?.translatedText ?? ''),
    detectedLanguage: data?.detectedLanguage,
    provider: data?.provider,
  };
}

export async function pickScanImage(
  source: 'camera' | 'library',
): Promise<{ uri: string; base64?: string | null } | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new AppError('Camera permission is required to scan a menu or sign.', {
        code: 'CAMERA_DENIED',
      });
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.uri) return null;
    return { uri: result.assets[0].uri, base64: result.assets[0].base64 };
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new AppError('Photo library permission is required to choose an image.', {
      code: 'LIBRARY_DENIED',
    });
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: false,
    base64: true,
  });
  if (result.canceled || !result.assets[0]?.uri) return null;
  return { uri: result.assets[0].uri, base64: result.assets[0].base64 };
}

/** Scan a photo (menu, sign, label) and translate — nothing is saved. */
export async function translateScannedImage(params: {
  uri: string;
  base64?: string | null;
  targetLang: string;
}): Promise<ScanTranslateResult> {
  const { base64, mimeType } = await uriToBase64(params.uri, params.base64);
  return callScanTranslate({
    imageBase64: base64,
    mimeType,
    targetLang: params.targetLang || 'en',
  });
}

/** Translate pasted / typed text — nothing is saved. */
export async function translatePlainText(params: {
  text: string;
  targetLang: string;
}): Promise<ScanTranslateResult> {
  const text = params.text.trim();
  if (!text) {
    throw new AppError('Enter some text to translate.', { code: 'EMPTY_TEXT' });
  }
  return callScanTranslate({
    text,
    targetLang: params.targetLang || 'en',
  });
}
