import { useEffect, useMemo, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Sidebar / multi-column shell — keep above phone landscape widths. */
const DESKTOP_MIN = 1024;
const WIDE_MIN = 1280;
const TABLET_MIN = 600;
/** Icon-first chrome kicks in below this (covers most phones incl. Plus sizes). */
const COMPACT_MAX = 430;

export type ResponsiveLayout = {
  isWeb: boolean;
  width: number;
  height: number;
  isDesktop: boolean;
  isWide: boolean;
  isTablet: boolean;
  /** Narrow phone web — prefer icon-first chrome. */
  isCompact: boolean;
  contentMaxWidth: number;
  placeColumns: 1 | 2 | 3;
  sidebarWidth: number;
  pagePaddingX: number;
  /** Horizontal content gutter for phone/tablet. */
  contentGutter: number;
  /** Bottom tab bar total height (0 on desktop). */
  tabBarHeight: number;
  /** Recommended ScrollView bottom padding so content clears tabs + FAB. */
  scrollBottomPad: number;
  /** Stack screens (no tab bar) — clears home indicator. */
  stackBottomPad: number;
};

function usePrefersCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mq = window.matchMedia('(pointer: coarse)');
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  return coarse;
}

/** Shared breakpoints for traveler web shell vs mobile/native layouts. */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const coarsePointer = usePrefersCoarsePointer();

  return useMemo(() => {
    // Touch phones in landscape can exceed 768px — don't treat them as desktop.
    const isDesktop = isWeb && width >= DESKTOP_MIN && !coarsePointer;
    const isWide = width >= WIDE_MIN;
    const isCompact = width < COMPACT_MAX;
    const isTablet = !isDesktop && width >= TABLET_MIN;
    const placeColumns: 1 | 2 | 3 = isDesktop ? (isWide ? 3 : 2) : isTablet ? 2 : 1;

    const safeBottom = Math.max(insets.bottom, 0);
    let tabBarHeight = 0;
    if (!isDesktop) {
      if (Platform.OS === 'ios') {
        tabBarHeight = 49 + Math.max(safeBottom, 20);
      } else if (isWeb) {
        // Icon-only phone bars stay shorter; labeled tablet bars need a bit more.
        const chrome = isTablet ? 58 : 54;
        tabBarHeight = chrome + Math.max(safeBottom, isWeb ? 10 : 8);
      } else {
        tabBarHeight = 56 + Math.max(safeBottom, 8);
      }
    }

    const fabClearance = isDesktop ? 24 : 72;
    const scrollBottomPad = isDesktop ? 48 : tabBarHeight + fabClearance;
    const stackBottomPad = Math.max(safeBottom, 12) + (isDesktop ? 32 : 28);
    const contentGutter = isDesktop ? 0 : isCompact ? 16 : 20;

    return {
      isWeb,
      width,
      height,
      isDesktop,
      isWide,
      isTablet,
      isCompact,
      contentMaxWidth: isWide ? 1120 : isDesktop ? 960 : isTablet ? 720 : width,
      placeColumns,
      sidebarWidth: isWide ? 248 : 232,
      pagePaddingX: isDesktop ? (isWide ? 36 : 28) : 0,
      contentGutter,
      tabBarHeight,
      scrollBottomPad,
      stackBottomPad,
    };
  }, [coarsePointer, height, insets.bottom, isWeb, width]);
}
