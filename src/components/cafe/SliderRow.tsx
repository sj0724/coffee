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
    <View className="flex-row items-center gap-2.5">
      <Text className="w-[52px] text-xs text-gray-400">{label}</Text>
      <View className="flex-1 flex-row items-center">
        {[1, 2, 3, 4, 5].flatMap((n) => {
          const items = [];
          if (n > 1) {
            items.push(
              <View
                key={`line-${n}`}
                className="h-0.5 flex-1"
                style={{ backgroundColor: n <= current ? COFFEE : EMPTY }}
              />,
            );
          }
          items.push(
            <TouchableOpacity
              key={`dot-${n}`}
              onPress={() => onChange(n)}
              className="h-[22px] w-[22px] items-center justify-center rounded-full"
              style={{ backgroundColor: n <= current ? COFFEE : EMPTY }}
            >
              <Text
                className="text-[11px] font-semibold"
                style={{ color: n <= current ? '#fff' : '#9CA3AF' }}
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
