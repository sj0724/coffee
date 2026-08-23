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
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 34, paddingBottom: 40 }}
    >
      <Text style={{ fontSize: 26, fontWeight: '800', color: '#101114', letterSpacing: -0.5 }}>
        무엇을 기록할까요?
      </Text>
      <Text
        style={{ marginTop: 8, marginBottom: 28, fontSize: 15, lineHeight: 22, color: '#70757E' }}
      >
        기록할 종류를 먼저 선택하면 필요한 항목만 보여드릴게요.
      </Text>

      <View style={{ gap: 14 }}>
        {OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.type}
            onPress={() => onSelect(option.type)}
            activeOpacity={0.75}
            style={{
              minHeight: 142,
              padding: 20,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: '#D8DADE',
              backgroundColor: '#F8F9FA',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 17,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ECEDEF',
              }}
            >
              <Ionicons name={option.icon} size={25} color="#3F4248" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 19, fontWeight: '800', color: '#101114' }}>
                {option.title}
              </Text>
              <Text style={{ marginTop: 7, fontSize: 14, lineHeight: 21, color: '#5F636B' }}>
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
