import { View, Text } from 'react-native';

const COFFEE = '#111111';
const EMPTY = '#D9D5CE';

export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      accessible
      accessibilityLabel={`${label} ${value}점`}
    >
      <Text style={{ fontSize: 13, color: '#514D47', fontWeight: '600', width: 52 }}>{label}</Text>
      <View
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
        importantForAccessibility="no-hide-descendants"
      >
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
    </View>
  );
}
