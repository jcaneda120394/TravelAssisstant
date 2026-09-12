import { useDisplayPrice } from '@/hooks/use-display-price';
import { AppText } from '@/components/ui/typography';

type Props = {
  amount: number | null | undefined;
  sourceCurrency: string;
  suffix?: string;
  className?: string;
  muted?: boolean;
};

/** Shows a price converted into the user's selected display currency. */
export function DisplayPriceText({
  amount,
  sourceCurrency,
  suffix = '',
  className,
  muted,
}: Props) {
  const { label, isLoading } = useDisplayPrice(amount, sourceCurrency, { suffix });

  if (amount == null) {
    return (
      <AppText muted={muted} className={className}>
        Rate unavailable
      </AppText>
    );
  }

  return (
    <AppText muted={muted} className={className}>
      {isLoading ? 'Converting…' : label}
    </AppText>
  );
}
