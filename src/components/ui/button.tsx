import type { ReactNode } from 'react';
import { ActivityIndicator } from 'react-native';

import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { theme } from '@/config/theme';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
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
  const colors = theme[scheme];

  const base = 'flex-row items-center justify-center rounded-2xl px-4 py-3';
  const variants = {
    primary: 'bg-brand-600',
    secondary: scheme === 'dark' ? 'bg-brand-800' : 'bg-brand-100',
    ghost: 'bg-transparent',
  } as const;

  const labelClass =
    variant === 'primary'
      ? 'text-white font-sans-semibold'
      : scheme === 'dark'
        ? 'text-ink-dark font-sans-semibold'
        : 'text-brand-800 font-sans-semibold';

  return (
    <Pressable
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-50' : 'opacity-100'}`}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <AppText className={labelClass}>{label}</AppText>
        </View>
      )}
    </Pressable>
  );
}
