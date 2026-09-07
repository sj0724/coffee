import { useRef, useState } from 'react';
import { Text, View } from 'react-native';

const MIN = 0.5;
const MAX = 1.5;
const THUMB_SIZE = 20;

export function FontScaleSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const trackLeft = useRef(0);
  const progress = (value - MIN) / (MAX - MIN);
  const travel = Math.max(0, width - THUMB_SIZE);

  function updateAt(x: number) {
    if (!travel) return;
    const ratio = Math.max(0, Math.min(1, (x - THUMB_SIZE / 2) / travel));
    onChange(Math.round((MIN + ratio * (MAX - MIN)) * 100) / 100);
  }

  return (
    <View className="flex-row items-center gap-3">
      <Text className="text-xs text-coffee-muted">크기</Text>
      <View
        className="h-11 flex-1 justify-center"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(event) => {
          trackLeft.current = event.nativeEvent.pageX - event.nativeEvent.locationX;
          updateAt(event.nativeEvent.locationX);
        }}
        onResponderMove={(event) => updateAt(event.nativeEvent.pageX - trackLeft.current)}
        onResponderTerminationRequest={() => false}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="글자 크기 배율"
        accessibilityValue={{ min: MIN, max: MAX, now: value, text: `${value.toFixed(2)}배` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          const step = event.nativeEvent.actionName === 'increment' ? 0.05 : -0.05;
          onChange(Math.round(Math.max(MIN, Math.min(MAX, value + step)) * 100) / 100);
        }}
      >
        <View
          pointerEvents="none"
          style={{
            marginHorizontal: THUMB_SIZE / 2,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#D8DADE',
          }}
        >
          <View
            style={{
              width: `${progress * 100}%`,
              height: 4,
              borderRadius: 2,
              backgroundColor: '#123C96',
            }}
          />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: progress * travel,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            backgroundColor: '#123C96',
          }}
        />
      </View>
      <Text
        className="w-12 text-right text-xs font-semibold text-coffee"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value.toFixed(2)}×
      </Text>
    </View>
  );
}
