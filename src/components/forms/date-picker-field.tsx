import { useMemo } from 'react';
import { Platform } from 'react-native';

import { AppText } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
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

/**
 * Web date field — always shows an editable native date input (calendar).
 * Avoids importing native DateTimePicker (codegenNativeComponent).
 */
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

  const minAttr = effectiveMinimum ? isoDayKey(effectiveMinimum) : undefined;
  const maxAttr = maximumDate ? isoDayKey(maximumDate) : undefined;
  const normalized = normalizeIsoDate(value) ?? value;

  const commit = (raw: string) => {
    const next = normalizeIsoDate(raw);
    if (!next) return;
    if (minAttr && next < minAttr) {
      onChange(minAttr);
      return;
    }
    if (maxAttr && next > maxAttr) {
      onChange(maxAttr);
      return;
    }
    onChange(next);
  };

  const borderColor = scheme === 'dark' ? 'rgba(15, 118, 110, 0.45)' : 'rgba(18, 32, 30, 0.08)';
  const bg = scheme === 'dark' ? '#0F2A28' : '#FFFFFF';
  const color = scheme === 'dark' ? '#E8F5F3' : '#12201E';

  return (
    <View className="mb-4">
      <AppText className="mb-2 font-sans-semibold">{label}</AppText>
      {/* Native HTML date input — editable calendar on web */}
      {Platform.OS === 'web' ? (
        // @ts-expect-error web DOM input
        <input
          type="date"
          value={normalized}
          min={minAttr}
          max={maxAttr}
          disabled={readOnly}
          onChange={(event: { target: { value: string } }) => commit(event.target.value)}
          aria-label={label}
          data-testid="date-picker-input"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            borderRadius: 16,
            borderWidth: 1,
            borderStyle: 'solid',
            borderColor,
            backgroundColor: bg,
            color,
            paddingTop: 14,
            paddingBottom: 14,
            paddingLeft: 16,
            paddingRight: 16,
            fontSize: 16,
            fontFamily: 'inherit',
            opacity: readOnly ? 0.6 : 1,
            cursor: readOnly ? 'default' : 'pointer',
          }}
        />
      ) : null}
      <AppText muted className="mt-1 text-xs">
        {readOnly
          ? `View only · ${formatDayLabel(normalized)}`
          : `Editable · ${formatDayLabel(normalized)}`}
      </AppText>
    </View>
  );
}
