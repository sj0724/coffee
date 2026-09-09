import { View, Text, TouchableOpacity } from 'react-native';

const FLAVOR_OPTIONS = [
  { label: '과일', tags: ['베리', '블루베리', '딸기', '체리', '오렌지', '자몽', '사과', '복숭아'] },
  { label: '꽃향', tags: ['자스민', '플로럴', '라벤더', '로즈'] },
  { label: '단맛', tags: ['카라멜', '흑설탕', '꿀', '메이플시럽'] },
  { label: '초콜릿/견과', tags: ['다크초콜릿', '밀크초콜릿', '코코아', '아몬드', '헤이즐넛'] },
  { label: '기타', tags: ['와인', '홍차', '스파이스', '허브'] },
];
const MAX_MY_NOTES = 5;

export function MyNotesInput({
  value,
  onChange,
}: {
  value?: string[];
  onChange: (tags: string[]) => void;
}) {
  const selected = value ?? [];

  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else if (selected.length < MAX_MY_NOTES) {
      onChange([...selected, tag]);
    }
  }

  return (
    <View className="gap-3 mb-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] text-[#5F636B]">내 노트</Text>
        <Text className="text-[13px] text-gray-400">
          {selected.length}/{MAX_MY_NOTES}
        </Text>
      </View>
      {FLAVOR_OPTIONS.map((group) => (
        <View key={group.label}>
          <Text className="text-[13px] text-gray-400 mb-1.5">{group.label}</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {group.tags.map((tag) => {
              const isSelected = selected.includes(tag);
              const isDisabled = !isSelected && selected.length >= MAX_MY_NOTES;
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggle(tag)}
                  disabled={isDisabled}
                  className={`px-3 py-1.5 rounded-full border ${
                    isSelected
                      ? 'bg-coffee border-coffee'
                      : isDisabled
                        ? 'border-gray-100 bg-gray-50'
                        : 'border-coffee-border bg-coffee-cream'
                  }`}
                >
                  <Text
                    className={`text-[13px] ${
                      isSelected ? 'text-white' : isDisabled ? 'text-gray-300' : 'text-[#5F636B]'
                    }`}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
