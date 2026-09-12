import type { ReactNode } from 'react';
import type { Edge } from 'react-native-safe-area-context';

import { PageContainer } from '@/components/layout/page-container';
import { SafeAreaView, Text, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

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
  edges = ['top'],
  unsafe = false,
  /** When true, skip desktop max-width wrapper (full-bleed heroes). */
  fullBleed = false,
}: {
  children: ReactNode;
  className?: string;
  testID?: string;
  /** Safe-area edges to pad. Ignored when `unsafe` is true. */
  edges?: Edge[];
  /** Full-bleed layout (e.g. Home hero under status bar). Caller must pad content. */
  unsafe?: boolean;
  fullBleed?: boolean;
}) {
  const scheme = useAppColorScheme();
  const { isDesktop } = useResponsiveLayout();
  const bg = scheme === 'dark' ? 'bg-surface-dark' : 'bg-surface-light';

  const body =
    unsafe || fullBleed || !isDesktop ? (
      children
    ) : (
      <PageContainer className="flex-1">{children}</PageContainer>
    );

  if (unsafe) {
    return (
      <View className={`flex-1 ${bg} ${className}`} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <SafeAreaView edges={edges} className={`flex-1 ${bg} ${className}`} testID={testID}>
      {body}
    </SafeAreaView>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  const scheme = useAppColorScheme();
  const bg = scheme === 'dark' ? 'bg-surface-cardDark' : 'bg-surface-cardLight';
  const border = scheme === 'dark' ? 'border-brand-800' : 'border-brand-100';

  return (
    <View
      className={`rounded-3xl border px-4 py-4 ${bg} ${border} ${className}`}
      style={
        scheme === 'dark'
          ? undefined
          : {
              shadowColor: '#0A7C74',
              shadowOpacity: 0.06,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }
      }
    >
      {children}
    </View>
  );
}

export function SectionHeader({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  const scheme = useAppColorScheme();

  return (
    <View className="mb-3 gap-1">
      {eyebrow ? (
        <AppText className="font-sans-semibold text-xs uppercase tracking-[0.16em] text-accent-500">
          {eyebrow}
        </AppText>
      ) : null}
      <AppText className="font-display-bold text-2xl leading-7">{title}</AppText>
      {subtitle ? <AppText muted className="text-[15px] leading-5">{subtitle}</AppText> : null}
      <View
        className={`mt-1 h-1 w-10 rounded-full ${
          scheme === 'dark' ? 'bg-accent-400' : 'bg-accent-500'
        }`}
      />
    </View>
  );
}
