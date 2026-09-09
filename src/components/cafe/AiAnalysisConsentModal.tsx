import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onAgree: () => void;
  onSkip: () => void;
  onViewPrivacy: () => void;
};

export function AiAnalysisConsentModal({ visible, onAgree, onSkip, onViewPrivacy }: Props) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onSkip}
      statusBarTranslucent
    >
      <View className="flex-1 justify-center bg-black/45 px-6">
        <View className="rounded-[22px] bg-white p-[22px]">
          <View className="mb-4 h-11 w-11 items-center justify-center rounded-full bg-accent-yellow-soft">
            <Ionicons name="sparkles-outline" size={22} color="#101114" />
          </View>

          <Text className="text-[19px] font-bold text-coffee">AI로 사진을 분석할까요?</Text>
          <Text className="mt-2.5 text-sm leading-[21px] text-coffee-tan">
            선택한 원두 카드 사진이 정보 추출을 위해 Cloudflare를 거쳐 Google Gemini로 전송됩니다.
            사진은 분석 결과를 만드는 용도로만 사용됩니다.
          </Text>

          <View className="mt-4 flex-row items-start gap-2 rounded-xl bg-[#F4F5F7] p-3">
            <Ionicons name="shield-checkmark-outline" size={17} color="#123C96" />
            <Text className="flex-1 text-[13px] leading-[18px] text-coffee-tan">
              동의하지 않아도 직접 입력하여 기록을 계속할 수 있습니다.
            </Text>
          </View>

          <TouchableOpacity
            onPress={onAgree}
            className="mt-5 items-center rounded-[14px] bg-accent py-[15px]"
          >
            <Text className="text-[15px] font-bold text-white">동의하고 분석</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} className="items-center py-3.5">
            <Text className="text-sm font-semibold text-coffee-tan">분석 없이 계속</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onViewPrivacy} className="items-center py-1">
            <Text className="text-[13px] text-coffee-warm underline">개인정보처리방침 보기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
