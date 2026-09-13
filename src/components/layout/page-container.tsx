import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { View } from '@/components/ui/primitives';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

type Props = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** Skip max-width (e.g. full-bleed hero wrappers that manage their own inner constraint). */
  fullBleed?: boolean;
  testID?: string;
};

/**
 * Centers and constrains content on desktop/tablet; phones keep full width.
 */
export function PageContainer({
  children,
  className = '',
  style,
  fullBleed = false,
  testID,
}: Props) {
  const { isDesktop, isTablet, contentMaxWidth, pagePaddingX } = useResponsiveLayout();

  if (fullBleed || (!isDesktop && !isTablet)) {
    return (
      <View className={className} style={style} testID={testID}>
        {children}
      </View>
    );
  }

  const padX = isDesktop ? pagePaddingX : 0;
  const scrollbarClearance = isDesktop ? 8 : 0;

  return (
    <View
      className={`w-full self-center ${className}`}
      style={[
        {
          maxWidth: contentMaxWidth,
          paddingLeft: padX,
          // Slightly more on the right so content never sits under the web scrollbar.
          paddingRight: padX + scrollbarClearance,
          width: '100%',
        },
        style,
      ]}
      testID={testID}
    >
      {children}
    </View>
  );
}
