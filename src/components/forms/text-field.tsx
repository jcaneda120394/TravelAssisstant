import { type StyleProp, type TextInputProps, type TextStyle } from 'react-native';

import { AppText } from '@/components/ui/typography';
import { TextInput, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useCountryAppearance } from '@/hooks/use-country-appearance';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  testID?: string;
  /** Smaller padding for dropdown-style pickers. */
  compact?: boolean;
};

export function TextField({
  label,
  error,
  testID,
  compact = false,
  style,
  ...props
}: Props) {
  const scheme = useAppColorScheme();
  const { colors } = useCountryAppearance();

  return (
    <View className={`w-full min-w-0 max-w-full ${compact ? 'mb-2' : 'mb-4'}`}>
      {label ? <AppText className="mb-2 font-sans-medium text-sm">{label}</AppText> : null}
      <TextInput
        testID={testID}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        className={`w-full min-w-0 max-w-full rounded-2xl border font-sans ${
          compact ? 'rounded-xl px-3 py-2 text-sm' : 'px-4 py-3.5 text-base'
        } ${
          scheme === 'dark'
            ? 'border-brand-800 bg-surface-cardDark text-ink-dark'
            : 'border-black/8 bg-white text-ink-light'
        } ${error ? 'border-red-400' : ''}`}
        style={[
          { width: '100%', maxWidth: '100%', minWidth: 0 } as TextStyle,
          style as StyleProp<TextStyle>,
        ]}
        {...props}
      />
      {error ? (
        <AppText className="mt-1 text-sm text-red-500">{error}</AppText>
      ) : null}
    </View>
  );
}
