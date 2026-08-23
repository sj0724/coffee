import { useEffect, useRef, useState } from 'react';
import { Animated, TextInput } from 'react-native';

export function NoteInput({
  label,
  value,
  onChange,
  onBlur,
  required = false,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const labelProgress = useRef(new Animated.Value(value ? 1 : 0)).current;
  const floated = focused || !!value;

  useEffect(() => {
    Animated.timing(labelProgress, {
      toValue: floated ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [floated, labelProgress]);

  return (
    <Animated.View
      style={{
        height: 56,
        borderBottomWidth: focused ? 1.5 : 1,
        borderBottomColor: focused ? '#123C96' : '#D8DADE',
      }}
    >
      <Animated.Text
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          top: labelProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 5] }),
          fontSize: labelProgress.interpolate({ inputRange: [0, 1], outputRange: [15, 11] }),
          color: focused ? '#123C96' : '#70757E',
        }}
      >
        {label}
        {required ? ' *' : ''}
      </Animated.Text>
      <TextInput
        style={{
          flex: 1,
          paddingTop: 19,
          paddingBottom: 3,
          paddingHorizontal: 0,
          fontSize: 15,
          color: '#101114',
        }}
        value={value ?? ''}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          onBlur?.();
        }}
        accessibilityLabel={`${label}${required ? ' 필수' : ''}`}
      />
    </Animated.View>
  );
}
