import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { formatDayLabel, startOfLocalToday, toLocalIsoDate } from '@/utils/dates';

type Props = {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
  /** Extra floor (e.g. trip start for end date). Past days are always blocked unless allowPast. */
  minimumDate?: Date;
  maximumDate?: Date;
  /** When true, past calendar days can be selected. Default false. */
  allowPast?: boolean;
  /** Display the date without opening the spinner / picker. */
  readOnly?: boolean;
};

function parseIsoDate(value: string, fallback = new Date()): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return fallback;
  }
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
    0,
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function normalizeIsoDate(raw: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) {
    return null;
  }
  const date = parseIsoDate(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return toLocalIsoDate(date) === raw.trim() ? raw.trim() : null;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function laterDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

function isoDayKey(date: Date): string {
  return toLocalIsoDate(date);
}

function DateDisplay({
  label,
  displayLabel,
  hint,
  borderClass,
  onPress,
  testID,
}: {
  label: string;
  displayLabel: string;
  hint: string;
  borderClass: string;
  onPress?: () => void;
  testID?: string;
}) {
  const body = (
    <View className={`rounded-2xl border px-4 py-3 ${borderClass}`} testID={testID}>
      <AppText className="font-sans-semibold">{displayLabel}</AppText>
      <AppText muted className="mt-0.5 text-xs">
        {hint}
      </AppText>
    </View>
  );

  return (
    <View className="mb-4">
      <AppText className="mb-2 font-sans-semibold">{label}</AppText>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${label}`}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}
    </View>
  );
}

export function DatePickerField({
  label = 'Date',
  value,
  onChange,
  minimumDate,
  maximumDate,
  allowPast = false,
  readOnly = false,
}: Props) {
  const scheme = useAppColorScheme();
  const hasValidDate = Boolean(normalizeIsoDate(value));
  const [editing, setEditing] = useState(false);
  const prevHadValid = useRef<boolean | null>(null);

  // Selected dates stay collapsed as text. Open the wheel only when empty or after tap.
  useEffect(() => {
    if (readOnly) {
      setEditing(false);
      prevHadValid.current = hasValidDate;
      return;
    }
    if (prevHadValid.current === null) {
      setEditing(!hasValidDate);
      prevHadValid.current = hasValidDate;
      return;
    }
    if (!hasValidDate) {
      setEditing(true);
    } else if (!prevHadValid.current) {
      // Parent hydrated empty → valid (or first pick finished) — show date only.
      setEditing(false);
    }
    prevHadValid.current = hasValidDate;
  }, [hasValidDate, readOnly]);

  const effectiveMinimum = useMemo(() => {
    const today = startOfLocalToday();
    if (allowPast) {
      return minimumDate ? startOfDay(minimumDate) : undefined;
    }
    if (!minimumDate) {
      return today;
    }
    return laterDate(today, startOfDay(minimumDate));
  }, [allowPast, minimumDate]);

  const dateValue = useMemo(() => {
    const parsed = parseIsoDate(value);
    if (!effectiveMinimum) {
      return parsed;
    }
    return laterDate(startOfDay(parsed), effectiveMinimum);
  }, [value, effectiveMinimum]);

  const displayLabel = useMemo(() => {
    const normalized = normalizeIsoDate(value);
    return normalized ? formatDayLabel(normalized) : value || 'Pick a date';
  }, [value]);

  const commitDate = (selected: Date) => {
    let next = toLocalIsoDate(selected);
    if (effectiveMinimum && isoDayKey(selected) < isoDayKey(effectiveMinimum)) {
      next = isoDayKey(effectiveMinimum);
    }
    if (maximumDate && isoDayKey(selected) > isoDayKey(maximumDate)) {
      next = isoDayKey(maximumDate);
    }
    onChange(next);
  };

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setEditing(false);
    }
    if (event.type === 'dismissed' || !selected) {
      return;
    }
    commitDate(selected);
  };

  const borderClass =
    scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-brand-100 bg-white';

  if (Platform.OS === 'web') {
    const minAttr = effectiveMinimum ? isoDayKey(effectiveMinimum) : undefined;
    const maxAttr = maximumDate ? isoDayKey(maximumDate) : undefined;
    if (readOnly || (hasValidDate && !editing)) {
      return (
        <DateDisplay
          label={label}
          displayLabel={displayLabel}
          hint={readOnly ? 'View only' : `Tap to change · ${value}`}
          borderClass={borderClass}
          onPress={readOnly ? undefined : () => setEditing(true)}
          testID={readOnly ? 'date-picker-readonly' : 'date-picker-label'}
        />
      );
    }
    return (
      <TextField
        label={label}
        value={value}
        onChangeText={(next) => {
          const normalized = normalizeIsoDate(next);
          if (!normalized) {
            onChange(next);
            return;
          }
          if (minAttr && normalized < minAttr) {
            onChange(minAttr);
            return;
          }
          if (maxAttr && normalized > maxAttr) {
            onChange(maxAttr);
            return;
          }
          onChange(normalized);
          setEditing(false);
        }}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        // @ts-expect-error web-only attrs passthrough
        min={minAttr}
        max={maxAttr}
      />
    );
  }

  if (readOnly || (hasValidDate && !editing)) {
    return (
      <DateDisplay
        label={label}
        displayLabel={displayLabel}
        hint={readOnly ? `View only · ${value}` : 'Tap to change'}
        borderClass={borderClass}
        onPress={readOnly ? undefined : () => setEditing(true)}
        testID={readOnly ? 'date-picker-readonly' : 'date-picker-label'}
      />
    );
  }

  return (
    <View className="mb-4">
      <AppText className="mb-2 font-sans-semibold">{label}</AppText>
      {Platform.OS === 'android' ? (
        <View>
          <Button
            label={hasValidDate ? displayLabel : 'Pick a date'}
            variant="secondary"
            onPress={() => setEditing(true)}
            testID="date-picker-open"
          />
          {editing ? (
            <DateTimePicker
              value={dateValue}
              mode="date"
              display="default"
              minimumDate={effectiveMinimum}
              maximumDate={maximumDate}
              onChange={handleChange}
            />
          ) : null}
        </View>
      ) : (
        <View className={`overflow-hidden rounded-2xl border ${borderClass}`}>
          <DateTimePicker
            value={dateValue}
            mode="date"
            display="spinner"
            minimumDate={effectiveMinimum}
            maximumDate={maximumDate}
            onChange={handleChange}
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            style={{ height: 160 }}
          />
          <View className="border-t border-brand-50 px-3 py-2 dark:border-brand-800">
            <Button
              label="Done"
              variant="secondary"
              onPress={() => setEditing(false)}
              testID="date-picker-done"
            />
          </View>
        </View>
      )}
    </View>
  );
}
