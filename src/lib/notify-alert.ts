import { Alert, Platform } from 'react-native';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

/**
 * Cross-platform alert — React Native's Alert.alert is a no-op on web,
 * which made save / auth prompts look like dead buttons on mobile Safari.
 */
export function notifyAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const body = message ? `${title}\n\n${message}` : title;
  const actions = (buttons ?? [{ text: 'OK' }]).filter((b) => b.style !== 'cancel');
  const cancel = (buttons ?? []).find((b) => b.style === 'cancel');

  if (actions.length <= 1 && !cancel) {
    window.alert(body);
    actions[0]?.onPress?.();
    return;
  }

  const primary = actions[0];
  const confirmed = window.confirm(
    primary ? `${body}\n\nOK = ${primary.text}${cancel ? ` · Cancel = ${cancel.text}` : ''}` : body,
  );
  if (confirmed) {
    primary?.onPress?.();
  } else {
    cancel?.onPress?.();
  }
}
