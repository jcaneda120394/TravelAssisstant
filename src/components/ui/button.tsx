import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { theme } from '@/config/theme';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useCountryAppearance } from '@/hooks/use-country-appearance';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent';
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  icon?: ReactNode;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  testID,
  icon,
}: ButtonProps) {
  const scheme = useAppColorScheme();
  const { colors } = useCountryAppearance();
  const spinnerColor = colors?.primary ?? theme[scheme].primary;

  const base =
    'w-full min-w-0 max-w-full flex-row items-center justify-center rounded-2xl px-4 py-3.5';
  const variants = {
    primary: 'bg-brand-600',
    accent: 'bg-accent-500',
    secondary:
      scheme === 'dark'
        ? 'bg-brand-900 border border-brand-800'
        : 'bg-white border border-black/8',
    ghost: 'bg-transparent',
  } as const;

  const labelClass =
    variant === 'primary' || variant === 'accent'
      ? 'text-white font-sans-semibold'
      : scheme === 'dark'
        ? 'text-ink-dark font-sans-semibold'
        : 'text-ink-light font-sans-semibold';

  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-50' : 'opacity-100'}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ maxWidth: '100%' }}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'accent' ? '#fff' : spinnerColor}
        />
      ) : (
        <View className="min-w-0 max-w-full flex-row items-center justify-center gap-2">
          {icon}
          <AppText className={`${labelClass} text-center`} numberOfLines={1}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}
