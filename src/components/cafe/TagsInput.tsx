import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';

export function TagsInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string[];
  onChange: (tags: string[]) => void;
}) {
  const [raw, setRaw] = useState(value?.join(', ') ?? '');

  return (
    <View>
      <Text className="text-[13px] text-[#666] mb-1">{label}</Text>
      <TextInput
        className="border border-coffee-border rounded-lg p-2.5 text-sm text-[#222] bg-white"
        value={raw}
        onChangeText={setRaw}
        onBlur={() =>
          onChange(
            raw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        placeholderTextColor="#ccc"
        placeholder="자스민, 복숭아, 꿀..."
      />
    </View>
  );
}
