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
 * Centers and constrains content on desktop web; no-ops on mobile/native.
 */
export function PageContainer({
  children,
  className = '',
  style,
  fullBleed = false,
  testID,
}: Props) {
  const { isDesktop, contentMaxWidth, pagePaddingX } = useResponsiveLayout();

  if (!isDesktop || fullBleed) {
    return (
      <View className={className} style={style} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <View
      className={`w-full self-center ${className}`}
      style={[
        {
          maxWidth: contentMaxWidth,
          paddingLeft: pagePaddingX,
          // Slightly more on the right so content never sits under the web scrollbar.
          paddingRight: pagePaddingX + 8,
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
