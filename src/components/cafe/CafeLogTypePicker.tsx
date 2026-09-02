import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OPTIONS = [
  {
    type: 'handdip' as const,
    icon: 'leaf-outline' as const,
    title: '원두 기록',
    description: '원두 카드와 함께 원산지, 품종, 가공법과 향미를 기록해요.',
  },
  {
    type: 'menu' as const,
    icon: 'cafe-outline' as const,
    title: '음료 기록',
    description: '카페에서 마신 커피나 논커피 메뉴와 맛을 간편하게 기록해요.',
  },
];

export function CafeLogTypePicker({ onSelect }: { onSelect: (type: 'handdip' | 'menu') => void }) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 34, paddingBottom: 40 }}
    >
      <Text className="text-[26px] font-extrabold tracking-[-0.5px] text-coffee">
        무엇을 기록할까요?
      </Text>
      <Text className="mb-7 mt-2 text-[15px] leading-[22px] text-coffee-soft">
        기록할 종류를 먼저 선택하면 필요한 항목만 보여드릴게요.
      </Text>

      <View className="gap-3.5">
        {OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.type}
            onPress={() => onSelect(option.type)}
            activeOpacity={0.75}
            className="min-h-[142px] flex-row items-center gap-4 rounded-[20px] border border-coffee-border bg-[#F8F9FA] p-5"
          >
            <View className="h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-coffee-separator">
              <Ionicons name={option.icon} size={25} color="#3F4248" />
            </View>
            <View className="flex-1">
              <Text className="text-[19px] font-extrabold text-coffee">{option.title}</Text>
              <Text className="mt-[7px] text-sm leading-[21px] text-coffee-tan">
                {option.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A49E96" />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
