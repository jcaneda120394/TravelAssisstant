import { TextField } from '@/components/forms/text-field';
import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { formatAgeList, parseAgeList } from '@/utils/companion-suitability';

type Props = {
  travelingWithKids: boolean;
  kidsAges: number[];
  travelingWithElderly: boolean;
  elderlyAges: number[];
  onChange: (next: {
    traveling_with_kids: boolean;
    kids_ages: number[];
    traveling_with_elderly: boolean;
    elderly_ages: number[];
    children?: number;
  }) => void;
};

function CheckRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  const scheme = useAppColorScheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      className={`mb-3 flex-row items-start gap-3 rounded-2xl border px-3 py-3 ${
        checked
          ? scheme === 'dark'
            ? 'border-brand-600 bg-brand-900'
            : 'border-brand-300 bg-brand-50'
          : scheme === 'dark'
            ? 'border-brand-800'
            : 'border-brand-100'
      }`}
    >
      <View
        className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${
          checked
            ? 'border-brand-600 bg-brand-600'
            : scheme === 'dark'
              ? 'border-brand-600'
              : 'border-brand-300'
        }`}
      >
        {checked ? <AppText className="text-xs font-sans-bold text-white">✓</AppText> : null}
      </View>
      <View className="flex-1">
        <AppText className="font-sans-semibold">{label}</AppText>
        <AppText muted className="mt-0.5 text-xs">
          {description}
        </AppText>
      </View>
    </Pressable>
  );
}

export function CompanionTravelFields({
  travelingWithKids,
  kidsAges,
  travelingWithElderly,
  elderlyAges,
  onChange,
}: Props) {
  return (
    <View className="mt-2">
      <AppText className="mb-2 font-sans-medium">Traveling companions</AppText>
      <AppText muted className="mb-3 text-xs">
        Check who you’re with — we’ll prioritize places that fit their ages.
      </AppText>

      <CheckRow
        label="Traveling with kids"
        description="Parks, zoos, family restaurants — filtered by age"
        checked={travelingWithKids}
        onToggle={() =>
          onChange({
            traveling_with_kids: !travelingWithKids,
            kids_ages: !travelingWithKids ? kidsAges : [],
            traveling_with_elderly: travelingWithElderly,
            elderly_ages: elderlyAges,
            children: !travelingWithKids ? Math.max(1, kidsAges.length || 1) : 0,
          })
        }
      />
      {travelingWithKids ? (
        <TextField
          label="Kids’ ages"
          placeholder="e.g. 4, 7, 12"
          value={formatAgeList(kidsAges)}
          keyboardType="numbers-and-punctuation"
          onChangeText={(text) => {
            const ages = parseAgeList(text, { min: 0, max: 17 });
            onChange({
              traveling_with_kids: true,
              kids_ages: ages,
              traveling_with_elderly: travelingWithElderly,
              elderly_ages: elderlyAges,
              children: Math.max(1, ages.length || 1),
            });
          }}
          testID="companion-kids-ages"
        />
      ) : null}

      <CheckRow
        label="Traveling with elderly"
        description="Gentle pacing — parks, museums, cafes, easy access"
        checked={travelingWithElderly}
        onToggle={() =>
          onChange({
            traveling_with_kids: travelingWithKids,
            kids_ages: kidsAges,
            traveling_with_elderly: !travelingWithElderly,
            elderly_ages: !travelingWithElderly ? elderlyAges : [],
          })
        }
      />
      {travelingWithElderly ? (
        <TextField
          label="Elderly ages"
          placeholder="e.g. 68, 74"
          value={formatAgeList(elderlyAges)}
          keyboardType="numbers-and-punctuation"
          onChangeText={(text) => {
            const ages = parseAgeList(text, { min: 55, max: 120 });
            onChange({
              traveling_with_kids: travelingWithKids,
              kids_ages: kidsAges,
              traveling_with_elderly: true,
              elderly_ages: ages,
            });
          }}
          testID="companion-elderly-ages"
        />
      ) : null}
    </View>
  );
}
