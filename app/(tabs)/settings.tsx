import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

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
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        gap: 14,
      }}
    >
      <Ionicons name={icon} size={20} color="#816F62" />
      <Text style={{ flex: 1, fontSize: 15, color: '#3A1B0F' }}>{label}</Text>
      {value ? (
        <Text style={{ fontSize: 14, color: '#A59688' }}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color="#C8BFB0" />
      ) : null}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: '600',
        color: '#A59688',
        letterSpacing: 0.5,
        paddingHorizontal: 20,
        paddingTop: 28,
        paddingBottom: 8,
      }}
    >
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  async function handleContact() {
    const subject = encodeURIComponent('[Coffee Note] 문의');
    const url = `mailto:${CONTACT_EMAIL}?subject=${subject}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('문의하기', `${CONTACT_EMAIL}으로 메일을 보내주세요.`);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* 헤더 */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#3A1B0F' }}>설정</Text>
      </View>

      <SectionHeader title="앱 정보" />
      <View style={{ marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' }}>
        <SettingRow icon="information-circle-outline" label="버전" value={APP_VERSION} />
      </View>

      <SectionHeader title="지원" />
      <View style={{ marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' }}>
        <SettingRow icon="mail-outline" label="문의하기" onPress={handleContact} />
      </View>

      <View style={{ height: 100 }} />
    </SafeAreaView>
  );
}
