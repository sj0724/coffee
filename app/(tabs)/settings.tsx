import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { hasCurrentAiConsent, revokeAiConsent } from '@/src/services/aiConsent';
import { PRIVACY_POLICY_URL, SUPPORT_URL, TERMS_OF_SERVICE_URL } from '@/src/config/legal';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const CONTACT_EMAIL = 'sj07245@gmail.com';

function SettingRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      className="flex-row items-center gap-3.5 bg-white px-5 py-4"
    >
      <Ionicons name={icon} size={20} color="#5F636B" />
      <Text className="flex-1 text-[15px] text-coffee">{label}</Text>
      {value ? (
        <Text className="text-sm text-coffee-warm">{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color="#D8DADE" />
      ) : null}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="px-5 pb-2 pt-7 text-xs font-semibold tracking-[0.5px] text-coffee-warm">
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const [aiConsented, setAiConsented] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void hasCurrentAiConsent().then(setAiConsented);
    }, []),
  );

  async function handleContact() {
    const subject = encodeURIComponent('[sanmi] 문의');
    const url = `mailto:${CONTACT_EMAIL}?subject=${subject}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('문의하기', `${CONTACT_EMAIL}으로 메일을 보내주세요.`);
    }
  }

  async function openWebPage(url: string) {
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert('페이지를 열 수 없어요.', '잠시 후 다시 시도해주세요.');
  }

  function handleRevokeAiConsent() {
    if (!aiConsented) return;
    Alert.alert('AI 분석 동의 철회', '철회하면 다음 AI 분석 전에 다시 동의를 요청합니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '철회',
        style: 'destructive',
        onPress: () => void revokeAiConsent().then(() => setAiConsented(false)),
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* 헤더 */}
      <View className="px-5 py-4">
        <Text className="text-2xl font-bold text-coffee">설정</Text>
      </View>

      <SectionHeader title="앱 정보" />
      <View className="mx-4 overflow-hidden rounded-xl">
        <SettingRow icon="information-circle-outline" label="버전" value={APP_VERSION} />
      </View>

      <SectionHeader title="지원" />
      <View className="mx-4 overflow-hidden rounded-xl">
        <SettingRow
          icon="help-circle-outline"
          label="고객 지원"
          onPress={() => void openWebPage(SUPPORT_URL)}
        />
        <SettingRow icon="mail-outline" label="문의하기" onPress={handleContact} />
      </View>

      <SectionHeader title="약관 및 개인정보" />
      <View className="mx-4 overflow-hidden rounded-xl">
        <SettingRow
          icon="shield-checkmark-outline"
          label="개인정보처리방침"
          onPress={() => void openWebPage(PRIVACY_POLICY_URL)}
        />
        <SettingRow
          icon="document-text-outline"
          label="서비스 이용약관"
          onPress={() => void openWebPage(TERMS_OF_SERVICE_URL)}
        />
        <SettingRow
          icon="sparkles-outline"
          label="AI 분석 동의"
          value={aiConsented ? '동의함' : '동의 안 함'}
          onPress={aiConsented ? handleRevokeAiConsent : undefined}
        />
      </View>

      <View className="h-[100px]" />
    </SafeAreaView>
  );
}
