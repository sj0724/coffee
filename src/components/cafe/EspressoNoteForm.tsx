import { View, Text, TouchableOpacity } from 'react-native';

export const ESPRESSO_TAGS = ['진함', '연함', '산미있음', '고소함'] as const;

export function EspressoNoteForm({
  tags,
  onChange,
  onSave,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  onSave?: () => void;
}) {
  function toggle(tag: string) {
    onChange(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);
  }

  return (
    <View className="gap-3 mt-1">
      <View className="flex-row flex-wrap gap-2">
        {ESPRESSO_TAGS.map((tag) => {
          const active = tags.includes(tag);
          return (
            <TouchableOpacity
              key={tag}
              onPress={() => toggle(tag)}
              className="rounded-full border-[1.5px] px-[18px] py-[9px]"
              style={{
                borderColor: active ? '#101114' : '#DDD',
                backgroundColor: active ? '#123C96' : '#FFFFFF',
              }}
            >
              <Text
                className="text-sm font-semibold"
                style={{ color: active ? '#fff' : '#70757E' }}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {onSave && (
        <TouchableOpacity className="items-center p-3 rounded-lg bg-coffee" onPress={onSave}>
          <Text className="font-bold text-white">저장</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
