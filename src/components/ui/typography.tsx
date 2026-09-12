import type { ReactNode } from 'react';

import { Text, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

type TextProps = {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  inverse?: boolean;
};

export function AppText({
  children,
  className = '',
  muted = false,
  inverse = false,
}: TextProps) {
  const scheme = useAppColorScheme();

  let colorClass = '';
  if (inverse) {
    colorClass = 'text-white';
  } else if (muted) {
    colorClass = scheme === 'dark' ? 'text-ink-mutedDark' : 'text-ink-mutedLight';
  } else {
    colorClass = scheme === 'dark' ? 'text-ink-dark' : 'text-ink-light';
  }

  return (
    <Text className={`font-sans text-base ${colorClass} ${className}`}>{children}</Text>
  );
}

export function Screen({
  children,
  className = '',
  testID,
}: {
  children: ReactNode;
  className?: string;
  testID?: string;
}) {
  const scheme = useAppColorScheme();
  const bg = scheme === 'dark' ? 'bg-surface-dark' : 'bg-surface-light';

  return (
    <View className={`flex-1 ${bg} ${className}`} testID={testID}>
      {children}
    </View>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  const scheme = useAppColorScheme();
  const bg = scheme === 'dark' ? 'bg-surface-cardDark' : 'bg-surface-cardLight';
  const border = scheme === 'dark' ? 'border-brand-800' : 'border-brand-100';

  return (
    <View className={`rounded-2xl border p-4 ${bg} ${border} ${className}`}>{children}</View>
  );
}

export function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="mb-3 gap-1">
      <AppText className="font-sans-bold text-xl">{title}</AppText>
      {subtitle ? <AppText muted>{subtitle}</AppText> : null}
    </View>
  );
}
