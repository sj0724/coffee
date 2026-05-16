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

const MAX_PHOTOS = 5;
type Photo = { uri: string };

export default function NewCafeLogScreen() {
  const router = useRouter();
  const [cafeName, setCafeName] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const visitedAt = date.toISOString().slice(0, 10);

  function onDateChange(_: unknown, selected?: Date) {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selected) setDate(selected);
  }

  const cameraOptions = {
    cropping: true,
    freeStyleCropEnabled: true,
    compressImageQuality: 1,
    ...CROP_TOOLBAR,
  };

  async function pickFromLibrary() {
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    try {
      const images = await ImageCropPicker.openPicker({
        multiple: true,
        maxFiles: remaining,
        compressImageQuality: 1,
      });
      setPhotos((prev) => [...prev, ...images.map((img) => ({ uri: img.path }))]);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('오류', '사진을 불러오지 못했어요.');
      }
    }
  }

  async function pickFromCamera() {
    if (photos.length >= MAX_PHOTOS) return;
    try {
      const image = await ImageCropPicker.openCamera(cameraOptions);
      setPhotos((prev) => [...prev, { uri: image.path }]);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code !== 'E_PICKER_CANCELLED') {
        Alert.alert('오류', '카메라를 열지 못했어요.');
      }
    }
  }

  function addPhoto() {
    Alert.alert('사진 추가', undefined, [
      { text: '카메라', onPress: pickFromCamera },
      { text: '갤러리에서 선택', onPress: pickFromLibrary },
      { text: '취소', style: 'cancel' },
    ]);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
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
      photos: photos.length > 0 ? JSON.stringify(photos.map((p) => p.uri)) : undefined,
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
        <Field label={`사진 (${photos.length}/${MAX_PHOTOS})`}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10 }}
          >
            {photos.map((p, i) => (
              <View key={i} style={{ position: 'relative' }}>
                <Image
                  source={{ uri: p.uri }}
                  style={{ width: 110, height: 146, borderRadius: 12 }}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    backgroundColor: 'rgba(0,0,0,0.52)',
                    borderRadius: 12,
                    padding: 2,
                  }}
                  onPress={() => removePhoto(i)}
                >
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}

            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity
                onPress={addPhoto}
                style={{
                  width: 110,
                  height: 146,
                  borderRadius: 12,
                  backgroundColor: '#EDE4DC',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderWidth: 1.5,
                  borderColor: '#D6C4B8',
                  borderStyle: 'dashed',
                }}
              >
                <Ionicons name="add" size={28} color="#6F4E37" />
                <Text style={{ fontSize: 12, color: '#6F4E37', fontWeight: '600' }}>사진 추가</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
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
