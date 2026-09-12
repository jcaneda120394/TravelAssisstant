import { type TextInputProps } from 'react-native';

import { AppText } from '@/components/ui/typography';
import { TextInput, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { theme } from '@/config/theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  testID?: string;
};

export function TextField({ label, error, testID, ...props }: Props) {
  const scheme = useAppColorScheme();
  const colors = theme[scheme];

  return (
    <View className="mb-4">
      <AppText className="mb-2 font-sans-medium text-sm">{label}</AppText>
      <TextInput
        testID={testID}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        className={`rounded-2xl border px-4 py-3 font-sans text-base ${
          scheme === 'dark'
            ? 'border-brand-800 bg-surface-cardDark text-ink-dark'
            : 'border-brand-100 bg-white text-ink-light'
        } ${error ? 'border-red-400' : ''}`}
        {...props}
      />
      {error ? (
        <AppText className="mt-1 text-sm text-red-500">{error}</AppText>
      ) : null}
    </View>
  );
}
