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
  numberOfLines?: number;
};

export function AppText({
  children,
  className = '',
  muted = false,
  inverse = false,
  numberOfLines,
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
    <Text
      numberOfLines={numberOfLines}
      className={`font-sans text-base ${colorClass} ${className}`}
    >
      {children}
    </Text>
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
  const { isDesktop, isTablet } = useResponsiveLayout();
  const bg = scheme === 'dark' ? 'bg-surface-dark' : 'bg-surface-light';

  const body =
    unsafe || fullBleed || (!isDesktop && !isTablet) ? (
      children
    ) : (
      <PageContainer className="flex-1">{children}</PageContainer>
    );

  const shellStyle = { width: '100%' as const, maxWidth: '100%' as const, minHeight: 0 };

  if (unsafe) {
    return (
      <View className={`flex-1 ${bg} ${className}`} style={shellStyle} testID={testID}>
        {body}
      </View>
    );
  }

  return (
    <SafeAreaView edges={edges} className={`flex-1 ${bg} ${className}`} style={shellStyle} testID={testID}>
      {body}
    </SafeAreaView>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  const scheme = useAppColorScheme();
  const bg = scheme === 'dark' ? 'bg-surface-cardDark' : 'bg-surface-cardLight';
  // Hairline only — no stacked shadow (industry travel UI: photo/whitespace carry depth).
  const border = scheme === 'dark' ? 'border-brand-800/80' : 'border-black/5';

  return (
    <View className={`rounded-2xl border px-4 py-4 ${bg} ${border} ${className}`}>
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
  const { isCompact } = useResponsiveLayout();
  return (
    <View className="mb-4 gap-1" style={{ maxWidth: '100%' }}>
      {eyebrow ? (
        <AppText className="font-sans-semibold text-xs uppercase tracking-[0.14em] text-accent-500">
          {eyebrow}
        </AppText>
      ) : null}
      <AppText
        className={`font-display-bold tracking-tight ${
          isCompact ? 'text-[22px] leading-7' : 'text-[26px] leading-8'
        }`}
      >
        {title}
      </AppText>
      {subtitle ? <AppText muted className="mt-0.5 text-[15px] leading-5">{subtitle}</AppText> : null}
    </View>
  );
}
