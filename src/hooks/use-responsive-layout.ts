import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

const DESKTOP_MIN = 768;
const WIDE_MIN = 1100;

export type ResponsiveLayout = {
  isWeb: boolean;
  width: number;
  height: number;
  isDesktop: boolean;
  isWide: boolean;
  contentMaxWidth: number;
  placeColumns: 1 | 2 | 3;
  sidebarWidth: number;
  pagePaddingX: number;
};

/** Shared breakpoints for traveler web shell vs mobile/native layouts. */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  return useMemo(() => {
    const isDesktop = isWeb && width >= DESKTOP_MIN;
    const isWide = width >= WIDE_MIN;
    const placeColumns: 1 | 2 | 3 = !isDesktop ? 1 : isWide ? 3 : 2;

    return {
      isWeb,
      width,
      height,
      isDesktop,
      isWide,
      contentMaxWidth: isWide ? 1120 : 960,
      placeColumns,
      sidebarWidth: 232,
      // Extra right padding on desktop web keeps grids clear of the scrollbar.
      pagePaddingX: isDesktop ? (isWide ? 36 : 28) : 0,
    };
  }, [height, isWeb, width]);
}
