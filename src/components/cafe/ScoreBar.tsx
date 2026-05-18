import { View, Text } from 'react-native';

const COFFEE = '#111111';
const EMPTY = '#E5E7EB';

export function ScoreBar({ label, value }: { label: string; value: number }) {
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
                style={{ flex: 1, height: 2, backgroundColor: n <= value ? COFFEE : EMPTY }}
              />,
            );
          }
          items.push(
            <View
              key={`dot-${n}`}
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: n <= value ? COFFEE : EMPTY,
              }}
            />,
          );
          return items;
        })}
      </View>
      <Text
        style={{ fontSize: 12, color: COFFEE, fontWeight: '600', width: 20, textAlign: 'right' }}
      >
        {value}
      </Text>
    </View>
  );
}
