import { Platform } from 'react-native';

/**
 * RN web Modal often leaves the document untouchable after dismiss
 * (overflow:hidden / pointer-events:none on body or #root).
 * Call after closing any Modal, and as a safety net on scroll/focus.
 */
export function unlockWebBodyScroll() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const clear = (el: HTMLElement | null) => {
    if (!el) return;
    el.style.overflow = '';
    el.style.pointerEvents = '';
    el.style.touchAction = '';
    el.removeAttribute('aria-hidden');
    el.removeAttribute('inert');
  };

  clear(document.body);
  clear(document.documentElement);

  const root =
    document.getElementById('root') ??
    document.getElementById('__next') ??
    (document.querySelector('[data-expo-root]') as HTMLElement | null);
  clear(root);

  // react-native-web Modal can leave sibling wrappers inert.
  document.querySelectorAll('[aria-hidden="true"]').forEach((node) => {
    const el = node as HTMLElement;
    // Only clear app shell wrappers — leave intentional dialogs alone.
    if (el === document.body || el === root || el.id === 'root' || el.id === '__next') {
      el.removeAttribute('aria-hidden');
      el.removeAttribute('inert');
      el.style.pointerEvents = '';
    }
  });
}
