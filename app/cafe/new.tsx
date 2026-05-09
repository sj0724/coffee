import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { createCafeLog } from '@/src/db/queries/cafeLogs';

export default function NewCafeLogScreen() {
  const router = useRouter();
  const [cafeName, setCafeName] = useState('');
  const [menuName, setMenuName] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [rating, setRating] = useState(0);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const visitedAt = date.toISOString().slice(0, 10);

  function onDateChange(_: unknown, selected?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDate(selected);
  }

  async function handleSave() {
    if (!cafeName.trim() || !menuName.trim()) {
      Alert.alert('필수 항목', '카페 이름과 메뉴 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    const id = await createCafeLog({
      cafe_name: cafeName.trim(),
      menu_name: menuName.trim(),
      visited_at: visitedAt,
      rating: rating || undefined,
      memo: memo.trim() || undefined,
    });
    setSaving(false);
    if (id != null) {
      router.replace(`/cafe/${id}`);
    } else {
      Alert.alert('오류', '저장에 실패했어요.');
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView className="flex-1 bg-coffee-light" contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Field label="카페 이름 *">
          <TextInput
            className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#222] bg-white"
            value={cafeName}
            onChangeText={setCafeName}
            placeholder="블루보틀, 스타벅스..."
            placeholderTextColor="#ccc"
          />
        </Field>

        <Field label="메뉴 이름 *">
          <TextInput
            className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#222] bg-white"
            value={menuName}
            onChangeText={setMenuName}
            placeholder="에스프레소, 플랫화이트..."
            placeholderTextColor="#ccc"
          />
        </Field>

        <Field label="방문 날짜">
          <TouchableOpacity
            className="border border-coffee-border rounded-lg p-3 bg-white flex-row justify-between items-center"
            onPress={() => setShowPicker(true)}
          >
            <Text className="text-[15px] text-[#222]">{visitedAt}</Text>
            <Text className="text-base">📅</Text>
          </TouchableOpacity>
        </Field>

        {Platform.OS === 'ios' && (
          <Modal transparent animationType="fade" visible={showPicker}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={1}
              onPress={() => setShowPicker(false)}
            >
              <View className="bg-white rounded-2xl p-4 w-[90%] items-center">
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="inline"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  locale="ko-KR"
                  accentColor="#6F4E37"
                  style={{ width: '100%' }}
                />
                <TouchableOpacity
                  className="mt-2 bg-coffee rounded-[10px] py-2.5 px-8"
                  onPress={() => setShowPicker(false)}
                >
                  <Text className="text-white text-[15px] font-semibold">확인</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {Platform.OS === 'android' && showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="calendar"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        <Field label="별점">
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n === rating ? 0 : n)}>
                <Text className={`text-[28px] ${n <= rating ? 'text-accent' : 'text-gray-300'}`}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        <Field label="메모">
          <TextInput
            className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#222] bg-white"
            style={{ height: 80, textAlignVertical: 'top' }}
            value={memo}
            onChangeText={setMemo}
            placeholder="오늘의 커피 한 줄 감상..."
            placeholderTextColor="#ccc"
            multiline
            numberOfLines={3}
          />
        </Field>

        <TouchableOpacity
          className={`bg-coffee rounded-xl p-4 items-center mt-2 ${saving ? 'opacity-60' : ''}`}
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-white text-base font-bold">{saving ? '저장 중...' : '저장'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-[#444]">{label}</Text>
      {children}
    </View>
  );
}
