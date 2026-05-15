import { View, Text, TextInput } from 'react-native';

export function NoteInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <View>
      <Text className="text-[13px] text-[#666] mb-1">{label}</Text>
      <TextInput
        className="border border-coffee-border rounded-lg p-2.5 text-sm text-[#222] bg-white"
        value={value ?? ''}
        onChangeText={onChange}
        placeholderTextColor="#ccc"
        placeholder={label}
      />
    </View>
  );
}
