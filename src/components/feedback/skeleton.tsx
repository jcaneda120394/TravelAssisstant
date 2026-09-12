import { View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

type SkeletonProps = {
  className?: string;
  height?: number;
};

export function Skeleton({ className = '', height = 16 }: SkeletonProps) {
  const scheme = useAppColorScheme();
  const bg = scheme === 'dark' ? 'bg-brand-800' : 'bg-brand-100';

  return (
    <View
      className={`w-full rounded-xl ${bg} ${className}`}
      style={{ height }}
      accessibilityLabel="Loading"
    />
  );
}
