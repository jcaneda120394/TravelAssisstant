import { cssInterop } from 'nativewind';
import { Text as RNText, View as RNView, Pressable as RNPressable, ScrollView as RNScrollView } from 'react-native';

export const View = cssInterop(RNView, { className: 'style' });
export const Text = cssInterop(RNText, { className: 'style' });
export const Pressable = cssInterop(RNPressable, { className: 'style' });
export const ScrollView = cssInterop(RNScrollView, { className: 'style' });
