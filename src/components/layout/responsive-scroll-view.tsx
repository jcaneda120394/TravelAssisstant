import type { ReactNode, Ref } from 'react';
import type { ScrollViewProps, StyleProp, ViewStyle } from 'react-native';

import { ScrollView } from '@/components/ui/primitives';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

type PadMode = 'tabs' | 'stack' | 'keyboard';

type Props = ScrollViewProps & {
  children: ReactNode;
  className?: string;
  contentContainerClassName?: string;
  /** tabs = clear bottom tab bar + FAB; stack = stack screens; keyboard = forms with sticky footers */
  pad?: PadMode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  scrollRef?: Ref<unknown>;
};

/**
 * ScrollView tuned for phone/tablet/desktop web — prevents overflow and
 * keeps content clear of the tab bar / home indicator.
 */
export function ResponsiveScrollView({
  children,
  className = 'flex-1',
  contentContainerClassName = '',
  pad = 'stack',
  contentContainerStyle,
  style,
  scrollRef,
  ...rest
}: Props) {
  const { scrollBottomPad, stackBottomPad } = useResponsiveLayout();

  const paddingBottom =
    pad === 'tabs'
      ? scrollBottomPad
      : pad === 'keyboard'
        ? Math.max(stackBottomPad, 120)
        : stackBottomPad;

  return (
    <ScrollView
      ref={scrollRef as never}
      className={className}
      contentContainerClassName={contentContainerClassName}
      style={[{ width: '100%', maxWidth: '100%', minHeight: 0 }, style]}
      contentContainerStyle={[{ paddingBottom, width: '100%', maxWidth: '100%' }, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
