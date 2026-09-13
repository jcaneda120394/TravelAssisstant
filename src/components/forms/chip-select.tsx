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

/**
 * Category / filter strip — soft fill when active, quiet outline when idle
 * (industry travel apps favor calm chips over heavy pill candy).
 */
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
            className={`rounded-xl px-3.5 py-2.5 ${
              selected
                ? scheme === 'dark'
                  ? 'bg-brand-800'
                  : 'bg-brand-600'
                : scheme === 'dark'
                  ? 'bg-transparent border border-brand-800'
                  : 'bg-transparent border border-black/8'
            }`}
          >
            <AppText
              inverse={selected}
              className={`text-sm ${selected ? 'font-sans-semibold' : 'font-sans-medium'}`}
            >
              {labels?.[option] ?? labelize(option)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
