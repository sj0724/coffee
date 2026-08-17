import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, View } from 'react-native';

// ── 분석 오버레이 ─────────────────────────────────────
const HANDDIP_MESSAGES = [
  '원두 카드 스캔 중...',
  '산지와 품종 파악 중...',
  '가공법과 로스팅 확인 중...',
  '공식 노트 정리 중...',
  '거의 다 됐어요...',
];
const MENU_MESSAGES = [
  '메뉴 사진 분석 중...',
  '음료 종류 확인 중...',
  '메뉴명 추출 중...',
  '거의 다 됐어요...',
];

export function AnalysisOverlay({ visible, mode }: { visible: boolean; mode: 'handdip' | 'menu' }) {
  const messages = mode === 'handdip' ? HANDDIP_MESSAGES : MENU_MESSAGES;
  const [msgIdx, setMsgIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) {
      setMsgIdx(0);
      fadeAnim.setValue(1);
      return;
    }
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setMsgIdx((i) => (i + 1) % messages.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
      }}
    >
      <ActivityIndicator size="large" color="#3A1B0F" />
      <Animated.Text
        style={{
          opacity: fadeAnim,
          fontSize: 16,
          color: '#3A1B0F',
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {messages[msgIdx]}
      </Animated.Text>
    </View>
  );
}
