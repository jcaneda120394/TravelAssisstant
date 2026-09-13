import { type ReactNode, useEffect } from 'react';
import { Modal, Platform } from 'react-native';

import { Pressable, View } from '@/components/ui/primitives';
import { unlockWebBodyScroll } from '@/utils/unlock-web-body';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Accessibility label for the dismiss backdrop. */
  dismissLabel?: string;
};

/**
 * Bottom sheet wrapper that aggressively clears RN-web body scroll locks
 * after dismiss (the usual cause of Explore needing a full refresh).
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  dismissLabel = 'Dismiss',
}: Props) {
  useEffect(() => {
    if (visible) return;
    const t = requestAnimationFrame(() => unlockWebBodyScroll());
    const t2 = setTimeout(() => unlockWebBodyScroll(), 50);
    const t3 = setTimeout(() => unlockWebBodyScroll(), 250);
    return () => {
      cancelAnimationFrame(t);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      onDismiss={unlockWebBodyScroll}
      onShow={() => {
        // Keep focus in the sheet; do not leave the document inert after animation.
        if (Platform.OS === 'web') {
          setTimeout(() => unlockWebBodyScroll(), 0);
        }
      }}
    >
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          className="flex-1"
          onPress={() => {
            onClose();
            unlockWebBodyScroll();
          }}
          accessibilityRole="button"
          accessibilityLabel={dismissLabel}
        />
        {children}
      </View>
    </Modal>
  );
}
