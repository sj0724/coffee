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
import { AddressSearchModal } from '@/src/components/AddressSearchModal';

const CROP_TOOLBAR = {
  cropperToolbarTitle: '사진 편집',
  cropperToolbarColor: '#000000',
  cropperToolbarWidgetColor: '#ffffff',
  cropperActiveWidgetColor: '#555555',
  cropperStatusBarColor: '#000000',
};

const MAX_PHOTOS = 5;
type Photo = { uri: string };

export default function NewCafeLogScreen() {
  const router = useRouter();
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; address: string } | null>(
    null,
  );
  const [showAddressSearch, setShowAddressSearch] = useState(false);
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
    if (!selectedPlace) {
      Alert.alert('필수 항목', '카페를 검색해서 선택해주세요.');
      return;
    }
    setSaving(true);
    const id = await createCafeLog({
      cafe_name: selectedPlace.name,
      visited_at: visitedAt,
      photos: photos.length > 0 ? JSON.stringify(photos.map((p) => p.uri)) : undefined,
      address: selectedPlace.address || undefined,
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
                  backgroundColor: '#EFEFEF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderWidth: 1.5,
                  borderColor: '#DDDDDD',
                  borderStyle: 'dashed',
                }}
              >
                <Ionicons name="add" size={28} color="#111111" />
                <Text style={{ fontSize: 12, color: '#111111', fontWeight: '600' }}>사진 추가</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Field>

        <Field label="카페 *">
          {selectedPlace ? (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#111111',
                padding: 14,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#222' }}>
                    {selectedPlace.name}
                  </Text>
                  {selectedPlace.address ? (
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                    >
                      <Ionicons name="location-outline" size={13} color="#999" />
                      <Text style={{ fontSize: 13, color: '#888' }} numberOfLines={2}>
                        {selectedPlace.address}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedPlace(null)}
                  style={{ padding: 2, marginLeft: 8 }}
                >
                  <Ionicons name="close-circle" size={20} color="#bbb" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setShowAddressSearch(true)}
                style={{ marginTop: 6, alignSelf: 'flex-start' }}
              >
                <Text style={{ fontSize: 12, color: '#111111', fontWeight: '600' }}>변경</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowAddressSearch(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 16,
                backgroundColor: '#fff',
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#DDDDDD',
                borderStyle: 'dashed',
              }}
            >
              <Ionicons name="search" size={18} color="#111111" />
              <Text style={{ fontSize: 15, color: '#111111', fontWeight: '600' }}>카페 검색</Text>
            </TouchableOpacity>
          )}
        </Field>

        <AddressSearchModal
          visible={showAddressSearch}
          onSelect={(result) => setSelectedPlace(result)}
          onClose={() => setShowAddressSearch(false)}
        />

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
                  accentColor="#111111"
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
