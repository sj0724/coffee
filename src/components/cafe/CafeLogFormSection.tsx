import type { ReactNode } from 'react';
import { View, Text } from 'react-native';

export function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-baseline gap-1.5">
        <Text className="text-[15px] font-bold text-coffee-muted">{label}</Text>
        {hint && <Text className="text-xs text-[#AAA]">{hint}</Text>}
      </View>
      {children}
    </View>
  );
}
