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
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
        }}
      >
        <View style={{ borderRadius: 22, backgroundColor: '#FFFFFF', padding: 22 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFF9C9',
              marginBottom: 16,
            }}
          >
            <Ionicons name="sparkles-outline" size={22} color="#101114" />
          </View>

          <Text style={{ color: '#101114', fontSize: 19, fontWeight: '700' }}>
            AI로 사진을 분석할까요?
          </Text>
          <Text
            style={{
              color: '#5F636B',
              fontSize: 14,
              lineHeight: 21,
              marginTop: 10,
            }}
          >
            선택한 원두 카드 사진이 정보 추출을 위해 Cloudflare를 거쳐 Google Gemini로 전송됩니다.
            사진은 분석 결과를 만드는 용도로만 사용됩니다.
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 8,
              borderRadius: 12,
              backgroundColor: '#F4F5F7',
              padding: 12,
              marginTop: 16,
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={17} color="#123C96" />
            <Text style={{ flex: 1, color: '#5F636B', fontSize: 12, lineHeight: 18 }}>
              동의하지 않아도 직접 입력하여 기록을 계속할 수 있습니다.
            </Text>
          </View>

          <TouchableOpacity
            onPress={onAgree}
            style={{
              alignItems: 'center',
              borderRadius: 14,
              backgroundColor: '#123C96',
              paddingVertical: 15,
              marginTop: 20,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>동의하고 분석</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={{ alignItems: 'center', paddingVertical: 14 }}>
            <Text style={{ color: '#5F636B', fontSize: 14, fontWeight: '600' }}>
              분석 없이 계속
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onViewPrivacy}
            style={{ alignItems: 'center', paddingVertical: 4 }}
          >
            <Text style={{ color: '#8D929B', fontSize: 12, textDecorationLine: 'underline' }}>
              개인정보처리방침 보기
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
