import { TextField } from '@/components/forms/text-field';

type Props = {
  label?: string;
  value: string;
  onChange: (time: string) => void;
  minuteInterval?: 1 | 5 | 10 | 15 | 20 | 30;
};

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

export function formatHhMm(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Web time field — avoids importing native DateTimePicker. */
export function TimePickerField({
  label = 'Start time',
  value,
  onChange,
}: Props) {
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
