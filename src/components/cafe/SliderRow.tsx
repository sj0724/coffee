import { View, Text, TouchableOpacity } from 'react-native';

const COFFEE = '#123C96';
const EMPTY = '#D8DADE';

export function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: number) => void;
}) {
  const current = value ?? 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ fontSize: 12, color: '#9CA3AF', width: 52 }}>{label}</Text>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].flatMap((n) => {
          const items = [];
          if (n > 1) {
            items.push(
              <View
                key={`line-${n}`}
                style={{ flex: 1, height: 2, backgroundColor: n <= current ? COFFEE : EMPTY }}
              />,
            );
          }
          items.push(
            <TouchableOpacity
              key={`dot-${n}`}
              onPress={() => onChange(n)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: n <= current ? COFFEE : EMPTY,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: n <= current ? '#fff' : '#9CA3AF',
                  fontWeight: '600',
                }}
              >
                {n}
              </Text>
            </TouchableOpacity>,
          );
          return items;
        })}
      </View>
    </View>
  );
}
