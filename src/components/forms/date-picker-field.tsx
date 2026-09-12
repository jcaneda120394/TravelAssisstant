import { useMemo, useState } from 'react';

import { TextField } from '@/components/forms/text-field';
import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { formatDayLabel, startOfLocalToday, toLocalIsoDate } from '@/utils/dates';

type Props = {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  allowPast?: boolean;
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

/** Web date field — avoids importing native DateTimePicker (codegenNativeComponent). */
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
  const [editing, setEditing] = useState(!hasValidDate);
  const borderClass =
    scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-brand-100 bg-white';

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

  const displayLabel = useMemo(() => {
    const normalized = normalizeIsoDate(value);
    return normalized ? formatDayLabel(normalized) : value || 'Pick a date';
  }, [value]);

  const minAttr = effectiveMinimum ? isoDayKey(effectiveMinimum) : undefined;
  const maxAttr = maximumDate ? isoDayKey(maximumDate) : undefined;

  if (readOnly || (hasValidDate && !editing)) {
    return (
      <View className="mb-4">
        <AppText className="mb-2 font-sans-semibold">{label}</AppText>
        <Pressable
          disabled={readOnly}
          onPress={readOnly ? undefined : () => setEditing(true)}
          accessibilityRole="button"
          className={`rounded-2xl border px-4 py-3 ${borderClass}`}
          testID={readOnly ? 'date-picker-readonly' : 'date-picker-label'}
        >
          <AppText className="font-sans-semibold">{displayLabel}</AppText>
          <AppText muted className="mt-0.5 text-xs">
            {readOnly ? 'View only' : `Tap to change · ${value}`}
          </AppText>
        </Pressable>
      </View>
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
