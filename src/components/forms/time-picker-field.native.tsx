import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

type Props = {
  label?: string;
  value: string;
  onChange: (time: string) => void;
  minuteInterval?: 1 | 5 | 10 | 15 | 20 | 30;
};

function parseHhMm(value: string): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  const date = new Date();
  if (!match) {
    date.setHours(11, 0, 0, 0);
    return date;
  }
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function formatHhMm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function normalizeHhMm(raw: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function TimePickerField({
  label = 'Start time',
  value,
  onChange,
  minuteInterval = 15,
}: Props) {
  const scheme = useAppColorScheme();
  const [androidOpen, setAndroidOpen] = useState(false);
  const dateValue = useMemo(() => parseHhMm(value), [value]);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setAndroidOpen(false);
    }
    if (event.type === 'dismissed' || !selected) {
      return;
    }
    onChange(formatHhMm(selected));
  };

  if (Platform.OS === 'web') {
    return (
      <TextField
        label={label}
        value={value}
        onChangeText={(next) => {
          const normalized = normalizeHhMm(next);
          onChange(normalized ?? next);
        }}
        placeholder="HH:MM"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
      />
    );
  }

  return (
    <View>
      <AppText className="mb-2 font-sans-semibold">{label}</AppText>
      {Platform.OS === 'android' ? (
        <View className="mb-1">
          <Button
            label={value}
            variant="secondary"
            onPress={() => setAndroidOpen(true)}
            testID="time-picker-open"
          />
          {androidOpen ? (
            <DateTimePicker
              value={dateValue}
              mode="time"
              display="default"
              is24Hour
              minuteInterval={minuteInterval}
              onChange={handleChange}
            />
          ) : null}
        </View>
      ) : (
        <View
          className={`overflow-hidden rounded-2xl border ${
            scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-brand-100 bg-white'
          }`}
        >
          <DateTimePicker
            value={dateValue}
            mode="time"
            display="spinner"
            minuteInterval={minuteInterval}
            onChange={handleChange}
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            style={{ height: 140 }}
          />
        </View>
      )}
    </View>
  );
}
