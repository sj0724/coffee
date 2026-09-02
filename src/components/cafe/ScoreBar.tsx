import { View, Text } from 'react-native';

const COFFEE = '#123C96';
const EMPTY = '#D8DADE';

export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View
      className="flex-row items-center gap-3"
      accessible
      accessibilityLabel={`${label} ${value}점`}
    >
      <Text className="w-[52px] text-[13px] font-semibold text-coffee-muted">{label}</Text>
      <View
        className="flex-1 flex-row items-center"
        importantForAccessibility="no-hide-descendants"
      >
        {[1, 2, 3, 4, 5].flatMap((n) => {
          const items = [];
          if (n > 1) {
            items.push(
              <View
                key={`line-${n}`}
                className="h-0.5 flex-1"
                style={{ backgroundColor: n <= value ? COFFEE : EMPTY }}
              />,
            );
          }
          items.push(
            <View
              key={`dot-${n}`}
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: n <= value ? COFFEE : EMPTY }}
            />,
          );
          return items;
        })}
      </View>
    </View>
  );
}
