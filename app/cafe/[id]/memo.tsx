import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getCafeLog, updateCafeLogMemo } from '@/src/db/queries/cafeLogs';

export default function EditCafeMemoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [memo, setMemo] = useState('');
  const [loading, setLoading] = useState(true);
  const [found, setFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCafeLog(Number(id)).then((log) => {
      if (!active) return;
      setFound(!!log);
      setMemo(log?.memo ?? '');
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);

  async function save() {
    if (busy.current || loading || !found) return;
    busy.current = true;
    setSaving(true);
    const success = await updateCafeLogMemo(Number(id), memo);
    busy.current = false;
    setSaving(false);
    if (success) router.back();
    else Alert.alert('오류', '메모를 저장하지 못했어요. 다시 시도해주세요.');
  }

  return (
    <>
      <Stack.Screen options={{ title: '메모 수정' }} />
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {loading ? (
          <ActivityIndicator color="#101114" />
        ) : !found ? (
          <Text className="text-coffee-muted">기록을 찾을 수 없어요.</Text>
        ) : (
          <>
            <Text className="mb-2 text-[13px] text-coffee-tan">한 줄 감상</Text>
            <TextInput
              className="min-h-[160px] rounded-xl border border-coffee-border p-3.5 text-[15px] text-coffee"
              style={{ textAlignVertical: 'top' }}
              value={memo}
              onChangeText={setMemo}
              placeholder="오늘의 카페 한 줄 감상..."
              placeholderTextColor="#C0C0C0"
              accessibilityLabel="카페 메모"
              multiline
              editable={!saving}
            />
            <TouchableOpacity
              className="mt-4 items-center rounded-lg bg-coffee p-3"
              onPress={save}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-bold text-white">저장</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </>
  );
}
