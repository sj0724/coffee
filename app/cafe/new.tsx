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
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import ImageCropPicker from 'react-native-image-crop-picker';
import { Ionicons } from '@expo/vector-icons';
import { createCafeLog } from '@/src/db/queries/cafeLogs';

const CROP_TOOLBAR = {
  cropperToolbarTitle: '사진 편집',
  cropperToolbarColor: '#3D2B1F',
  cropperToolbarWidgetColor: '#ffffff',
  cropperActiveWidgetColor: '#F4A261',
  cropperStatusBarColor: '#3D2B1F',
};

type Photo = { uri: string; width: number; height: number };

export default function NewCafeLogScreen() {
  const router = useRouter();
  const [cafeName, setCafeName] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);

  const visitedAt = date.toISOString().slice(0, 10);

  const imgDisplayWidth = photo?.width ?? 200;
  const imgDisplayHeight = photo?.height ?? 300;

  function onDateChange(_: unknown, selected?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDate(selected);
  }

  const cropOptions = {
    width: 300,
    height: 400,
    cropping: true,
    freeStyleCropEnabled: true,
    ...CROP_TOOLBAR,
  };

  async function pickFromLibrary() {
    try {
      const image = await ImageCropPicker.openPicker(cropOptions);
      setPhoto({ uri: image.path, width: image.width, height: image.height });
    } catch (e: unknown) {
      if ((e as { code?: string })?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('오류', '사진을 불러오지 못했어요.');
      }
    }
  }

  async function pickFromCamera() {
    try {
      const image = await ImageCropPicker.openCamera(cropOptions);
      setPhoto({ uri: image.path, width: image.width, height: image.height });
    } catch (e: unknown) {
      if ((e as { code?: string })?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('오류', '카메라를 열지 못했어요.');
      }
    }
  }

  async function handleSave() {
    if (!cafeName.trim()) {
      Alert.alert('필수 항목', '카페 이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    const id = await createCafeLog({
      cafe_name: cafeName.trim(),
      visited_at: visitedAt,
      photo_uri: photo?.uri,
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
      <ScrollView
        className="flex-1 bg-coffee-light"
        contentContainerStyle={{ padding: 20, gap: 20 }}
      >
        <Field label="사진">
          <View className="gap-3">
            {photo && (
              <View className="rounded-xl">
                <Image
                  source={{ uri: photo.uri }}
                  style={{
                    width: imgDisplayWidth,
                    height: imgDisplayHeight,
                    alignSelf: 'center',
                    borderRadius: 12,
                  }}
                  contentFit="cover"
                />
                <TouchableOpacity
                  className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5"
                  onPress={() => setPhoto(null)}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-row items-center justify-center flex-1 gap-2 py-3 bg-white border border-coffee-border rounded-xl"
                onPress={pickFromCamera}
              >
                <Ionicons name="camera-outline" size={20} color="#6F4E37" />
                <Text className="text-sm font-semibold text-coffee">카메라</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center justify-center flex-1 gap-2 py-3 bg-white border border-coffee-border rounded-xl"
                onPress={pickFromLibrary}
              >
                <Ionicons name="images-outline" size={20} color="#6F4E37" />
                <Text className="text-sm font-semibold text-coffee">갤러리</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Field>

        <Field label="카페 이름 *">
          <TextInput
            className="border border-coffee-border rounded-lg p-3 text-[15px] text-[#222] bg-white"
            value={cafeName}
            onChangeText={setCafeName}
            placeholder="블루보틀, 스타벅스..."
            placeholderTextColor="#ccc"
          />
        </Field>

        <Field label="방문 날짜">
          <TouchableOpacity
            className="flex-row items-center justify-between p-3 bg-white border rounded-lg border-coffee-border"
            onPress={() => setShowPicker(true)}
          >
            <Text className="text-[15px] text-[#222]">{visitedAt}</Text>
          </TouchableOpacity>
        </Field>

        {Platform.OS === 'ios' && (
          <Modal transparent animationType="fade" visible={showPicker}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.4)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
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
          <Text className="text-base font-bold text-white">{saving ? '저장 중...' : '저장'}</Text>
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
