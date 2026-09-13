import { Children, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { View } from '@/components/ui/primitives';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

type Props = {
  children: ReactNode;
  className?: string;
  gap?: number;
};

/**
 * Responsive place card grid — 1 col mobile, 2–3 cols on desktop web.
 * Avoids negative margins that pull cards under overlay scrollbars.
 */
export function PlaceGrid({ children, className = '', gap = 16 }: Props) {
  const { placeColumns } = useResponsiveLayout();
  const items = Children.toArray(children);

  if (placeColumns === 1) {
    return <View className={className}>{items}</View>;
  }

  const widthPercent = 100 / placeColumns;
  // Leave a little room on the right so the last column clears the web scrollbar.
  const scrollbarClearance = Platform.OS === 'web' ? 8 : 0;

  return (
    <View
      className={`mb-2 flex-row flex-wrap ${className}`}
      style={{
        marginLeft: -gap / 2,
        marginRight: -(gap / 2) + scrollbarClearance,
        paddingRight: scrollbarClearance,
      }}
    >
      {items.map((child, index) => (
        <View
          // eslint-disable-next-line react/no-array-index-key -- stable order from parent keys inside child
          key={index}
          style={{
            width: `${widthPercent}%`,
            paddingHorizontal: gap / 2,
            marginBottom: gap,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}
