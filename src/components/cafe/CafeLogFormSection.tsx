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
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#3F4248' }}>{label}</Text>
        {hint && <Text style={{ fontSize: 12, color: '#AAA' }}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}
