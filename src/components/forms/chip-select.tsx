import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { labelize } from '@/constants/preferences';

type Props<T extends string> = {
  options: readonly T[];
  values: T[];
  onChange: (next: T[]) => void;
  multiple?: boolean;
  labels?: Partial<Record<T, string>>;
};

export function ChipSelect<T extends string>({
  options,
  values,
  onChange,
  multiple = true,
  labels,
}: Props<T>) {
  const scheme = useAppColorScheme();

  const toggle = (option: T) => {
    if (!multiple) {
      onChange([option]);
      return;
    }

    if (values.includes(option)) {
      onChange(values.filter((item) => item !== option));
      return;
    }

    onChange([...values, option]);
  };

  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const selected = values.includes(option);
        return (
          <Pressable
            key={option}
            onPress={() => toggle(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`rounded-full px-3 py-2 border ${
              selected
                ? 'bg-brand-600 border-brand-600'
                : scheme === 'dark'
                  ? 'bg-surface-cardDark border-brand-800'
                  : 'bg-white border-brand-100'
            }`}
          >
            <AppText
              inverse={selected}
              className={`text-sm font-sans-medium ${selected ? '' : ''}`}
            >
              {labels?.[option] ?? labelize(option)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
