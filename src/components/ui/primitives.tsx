import { cssInterop } from 'nativewind';
import { forwardRef } from 'react';
import {
  Platform,
  Text as RNText,
  View as RNView,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TextInput as RNTextInput,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

export const View = cssInterop(RNView, { className: 'style' });
export const Text = cssInterop(RNText, { className: 'style' });
export const Pressable = cssInterop(RNPressable, { className: 'style' });
export const TextInput = cssInterop(RNTextInput, { className: 'style' });
export const SafeAreaView = cssInterop(RNSafeAreaView, { className: 'style' });

/**
 * On web, overlay scrollbars paint on top of content. Reserve gutter space and
 * add a little right padding so cards/columns are never clipped by the thumb.
 */
const ScrollViewBase = forwardRef<RNScrollView, ScrollViewProps>(function ScrollViewBase(
  { style, contentContainerStyle, ...props },
  ref,
) {
  if (Platform.OS !== 'web') {
    return (
      <RNScrollView
        ref={ref}
        style={style}
        contentContainerStyle={contentContainerStyle}
        {...props}
      />
    );
  }

  return (
    <RNScrollView
      ref={ref}
      style={[
        {
          // Web-only CSS property — keeps classic scrollbar gutters.
          // @ts-expect-error react-native style types omit scrollbarGutter
          scrollbarGutter: 'stable',
        },
        style,
      ]}
      contentContainerStyle={[{ paddingRight: 16 }, contentContainerStyle]}
      {...props}
    />
  );
});

export const ScrollView = cssInterop(ScrollViewBase, {
  className: 'style',
  contentContainerClassName: 'contentContainerStyle',
});
