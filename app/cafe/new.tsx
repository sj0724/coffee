import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createCafeLog } from '@/src/db/queries/cafeLogs';
import { createMenuItem } from '@/src/db/queries/cafeMenuItems';
import { upsertTastingNote } from '@/src/db/queries/tastingNotes';
import { AddressSearchModal } from '@/src/components/AddressSearchModal';
import { detectAndCrop } from '@/modules/document-scanner';
import { analyzeCardImages } from '@/src/services/visionLLM';
import { NoteInput } from '@/src/components/cafe/NoteInput';
import { TagsInput } from '@/src/components/cafe/TagsInput';
import { MyNotesInput } from '@/src/components/cafe/MyNotesInput';
import { SliderRow } from '@/src/components/cafe/SliderRow';
import type { HanddripNoteBean } from '@/src/types';

const KAKAO_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

interface NearbyPlace {
  id: string;
  place_name: string;
  road_address_name: string;
  address_name: string;
  distance?: string;
}

const TOTAL_STEPS = 4;
const STEP_LABELS = ['사진', '카페', '정보', '메모'];

export default function NewCafeLogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  const [step, setStep] = useState(1);

  // Step 1 - 사진
  const [notePhotos, setNotePhotos] = useState<string[]>([]);
  const [cafePhotos, setCafePhotos] = useState<string[]>([]);
  const [scanningNote, setScanningNote] = useState(false);
  const [scanningCafe, setScanningCafe] = useState(false);

  // Step 2 - 카페
  const [photoCoords, setPhotoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; address: string } | null>(
    null,
  );
  const [date, setDate] = useState(new Date());
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 3 - 정보
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [menuName, setMenuName] = useState('');
  const [isBlend, setIsBlend] = useState(0);
  const [origin, setOrigin] = useState('');
  const [farm, setFarm] = useState('');
  const [variety, setVariety] = useState('');
  const [process, setProcess] = useState('');
  const [roastLevel, setRoastLevel] = useState('');
  const [officialNotes, setOfficialNotes] = useState<string[]>([]);
  const [myNotes, setMyNotes] = useState<string[]>([]);
  const [acidity, setAcidity] = useState<number | undefined>();
  const [nuttiness, setNuttiness] = useState<number | undefined>();
  const [richness, setRichness] = useState<number | undefined>();
  const [smoothness, setSmoothness] = useState<number | undefined>();
  const [beans, setBeans] = useState<HanddripNoteBean[]>([]);

  // Step 4 - 메모
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  const visitedAt = date.toISOString().slice(0, 10);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / TOTAL_STEPS,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [step]);

  // Step 2 진입 시 근처 카페 자동 검색
  useEffect(() => {
    if (step === 2 && photoCoords && nearbyPlaces.length === 0 && !nearbyLoading) {
      fetchNearby();
    }
  }, [step]);

  async function fetchNearby() {
    if (!photoCoords) return;
    setNearbyLoading(true);
    try {
      const res = await fetch(
        `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=CE7&x=${photoCoords.lng}&y=${photoCoords.lat}&radius=500&sort=distance&size=10`,
        { headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` } },
      );
      const json = await res.json();
      setNearbyPlaces(json.documents ?? []);
    } catch {
      setNearbyPlaces([]);
    } finally {
      setNearbyLoading(false);
    }
  }

  // Step 3 진입 시 Gemini 분석 자동 실행
  useEffect(() => {
    if (step === 3 && !analyzed && notePhotos.length > 0) {
      runAnalysis();
    }
  }, [step]);

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const result = await analyzeCardImages(notePhotos);
      if (result) {
        if (result.is_blend !== undefined) setIsBlend(result.is_blend);
        if (result.origin) setOrigin(result.origin);
        if (result.farm) setFarm(result.farm);
        if (result.variety) setVariety(result.variety);
        if (result.process) setProcess(result.process);
        if (result.roast_level) setRoastLevel(result.roast_level);
        if (result.official_notes?.length) setOfficialNotes(result.official_notes);
        if (result.beans?.length) setBeans(result.beans);
      }
    } finally {
      setAnalyzing(false);
      setAnalyzed(true);
    }
  }

  function goNext() {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  }

  // ── 사진 피커 ──────────────────────────────────────────
  async function pickNotePhoto() {
    if (notePhotos.length >= 2) return;
    Alert.alert('노트 사진', undefined, [
      { text: '카메라', onPress: () => pickNoteFromCamera() },
      { text: '갤러리', onPress: () => pickNoteFromLibrary() },
      { text: '취소', style: 'cancel' },
    ]);
  }

  async function pickNoteFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled) addNotePhoto(result.assets[0].uri);
  }

  async function pickNoteFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 접근 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled) addNotePhoto(result.assets[0].uri);
  }

  async function addNotePhoto(rawUri: string) {
    setScanningNote(true);
    let uri = rawUri;
    try {
      uri = await detectAndCrop(rawUri);
    } catch {
      // detectAndCrop 실패 시 원본 사용
    }
    setNotePhotos((prev) => [...prev, uri]);
    setAnalyzed(false);
    setScanningNote(false);
  }

  async function pickCafePhoto() {
    if (cafePhotos.length >= 10) return;
    Alert.alert('사진 추가', undefined, [
      { text: '카메라', onPress: () => pickCafeFromCamera() },
      { text: '갤러리', onPress: () => pickCafeFromLibrary() },
      { text: '취소', style: 'cancel' },
    ]);
  }

  function extractCoordsFromExif(exif: Record<string, unknown> | null | undefined) {
    if (!exif) return;
    const lat = exif.GPSLatitude;
    const lng = exif.GPSLongitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    const latSigned = exif.GPSLatitudeRef === 'S' ? -Math.abs(lat) : Math.abs(lat);
    const lngSigned = exif.GPSLongitudeRef === 'W' ? -Math.abs(lng) : Math.abs(lng);
    setPhotoCoords((prev) => prev ?? { lat: latSigned, lng: lngSigned });
  }

  async function pickCafeFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1, exif: true });
    if (!result.canceled) {
      extractCoordsFromExif(result.assets[0].exif as Record<string, unknown>);
      addCafePhoto(result.assets[0].uri);
    }
  }

  async function pickCafeFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 접근 권한이 필요해요.');
      return;
    }
    const remaining = 10 - cafePhotos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
      exif: true,
    });
    if (!result.canceled) {
      extractCoordsFromExif(result.assets[0].exif as Record<string, unknown>);
      setScanningCafe(true);
      const uris = await Promise.all(
        result.assets.map(async (a) => {
          try {
            return await detectAndCrop(a.uri);
          } catch {
            return a.uri;
          }
        }),
      );
      setCafePhotos((prev) => [...prev, ...uris]);
      setScanningCafe(false);
    }
  }

  async function addCafePhoto(rawUri: string) {
    setScanningCafe(true);
    let uri = rawUri;
    try {
      uri = await detectAndCrop(rawUri);
    } catch {
      // detectAndCrop 실패 시 원본 사용
    }
    setCafePhotos((prev) => [...prev, uri]);
    setScanningCafe(false);
  }

  // ── 저장 ──────────────────────────────────────────────
  async function handleSave() {
    if (!selectedPlace) return;
    setSaving(true);
    try {
      const logId = await createCafeLog({
        cafe_name: selectedPlace.name,
        visited_at: visitedAt,
        photos: cafePhotos.length > 0 ? JSON.stringify(cafePhotos) : undefined,
        note_photos: notePhotos.length > 0 ? JSON.stringify(notePhotos) : undefined,
        address: selectedPlace.address || undefined,
        memo: memo.trim() || undefined,
      });

      if (logId == null) {
        Alert.alert('오류', '저장에 실패했어요.');
        return;
      }

      const hasInfo =
        origin ||
        farm ||
        variety ||
        process ||
        roastLevel ||
        officialNotes.length > 0 ||
        myNotes.length > 0 ||
        acidity != null ||
        (isBlend && beans.length > 0);

      if (menuName.trim() || hasInfo) {
        const menuId = await createMenuItem({
          cafe_log_id: logId,
          menu_name: menuName.trim() || (notePhotos.length > 0 ? '핸드드립' : '커피'),
        });
        if (menuId != null && hasInfo) {
          await upsertTastingNote({
            cafe_menu_item_id: menuId,
            is_blend: isBlend,
            origin: isBlend ? undefined : origin || undefined,
            farm: isBlend ? undefined : farm || undefined,
            variety: isBlend ? undefined : variety || undefined,
            process: isBlend ? undefined : process || undefined,
            roast_level: roastLevel || undefined,
            official_notes: officialNotes,
            my_notes: myNotes,
            acidity,
            nuttiness,
            richness,
            smoothness,
            beans: isBlend ? beans : [],
          });
        }
      }

      router.replace(`/cafe/${logId}`);
    } finally {
      setSaving(false);
    }
  }

  function onDateChange(_: unknown, selected?: Date) {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setDate(selected);
  }

  // ── 렌더 ──────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F7F3EF', paddingTop: insets.top }}>
      {/* 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <TouchableOpacity onPress={goBack} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#222' }}>
          새 카페 기록
        </Text>
        <Text style={{ fontSize: 13, color: '#999', fontWeight: '500' }}>
          {step}/{TOTAL_STEPS} {STEP_LABELS[step - 1]}
        </Text>
      </View>

      {/* 진행률 바 */}
      <View
        style={{
          height: 3,
          backgroundColor: '#E5DDD5',
          marginHorizontal: 16,
          borderRadius: 2,
          marginVertical: 16,
        }}
      >
        <Animated.View
          style={{
            height: 3,
            backgroundColor: '#5C3D2E',
            borderRadius: 2,
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* 스텝 컨텐츠 */}
        <ScrollView
          key={step}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && (
            <Step1
              notePhotos={notePhotos}
              cafePhotos={cafePhotos}
              scanningNote={scanningNote}
              scanningCafe={scanningCafe}
              onAddNotePhoto={pickNotePhoto}
              onRemoveNotePhoto={(i) => setNotePhotos((p) => p.filter((_, idx) => idx !== i))}
              onAddCafePhoto={pickCafePhoto}
              onRemoveCafePhoto={(i) => setCafePhotos((p) => p.filter((_, idx) => idx !== i))}
            />
          )}
          {step === 2 && (
            <Step2
              selectedPlace={selectedPlace}
              visitedAt={visitedAt}
              nearbyPlaces={nearbyPlaces}
              nearbyLoading={nearbyLoading}
              hasCoords={photoCoords !== null}
              onSelectNearby={(p) =>
                setSelectedPlace({
                  name: p.place_name,
                  address: p.road_address_name || p.address_name,
                })
              }
              onOpenSearch={() => setShowAddressSearch(true)}
              onClearPlace={() => setSelectedPlace(null)}
              onOpenDatePicker={() => setShowDatePicker(true)}
            />
          )}
          {step === 3 && (
            <Step3
              analyzing={analyzing}
              analyzed={analyzed}
              onReanalyze={notePhotos.length > 0 ? runAnalysis : undefined}
              menuName={menuName}
              onMenuName={setMenuName}
              isBlend={isBlend}
              onIsBlend={setIsBlend}
              origin={origin}
              onOrigin={setOrigin}
              farm={farm}
              onFarm={setFarm}
              variety={variety}
              onVariety={setVariety}
              process={process}
              onProcess={setProcess}
              roastLevel={roastLevel}
              onRoastLevel={setRoastLevel}
              officialNotes={officialNotes}
              onOfficialNotes={setOfficialNotes}
              myNotes={myNotes}
              onMyNotes={setMyNotes}
              acidity={acidity}
              onAcidity={setAcidity}
              nuttiness={nuttiness}
              onNuttiness={setNuttiness}
              richness={richness}
              onRichness={setRichness}
              smoothness={smoothness}
              onSmoothness={setSmoothness}
              beans={beans}
              onBeans={setBeans}
            />
          )}
          {step === 4 && <Step4 memo={memo} onMemo={setMemo} />}
        </ScrollView>

        {/* 하단 버튼 */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 16,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: '#EDE8E3',
            backgroundColor: '#F7F3EF',
          }}
        >
          {step < TOTAL_STEPS ? (
            <TouchableOpacity
              onPress={goNext}
              disabled={step === 2 && !selectedPlace}
              style={{
                backgroundColor: step === 2 && !selectedPlace ? '#C5B8AE' : '#5C3D2E',
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>다음</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !selectedPlace}
              style={{
                backgroundColor: saving || !selectedPlace ? '#C5B8AE' : '#5C3D2E',
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: 'center',
              }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>등록 완료</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* 카페 검색 모달 */}
      <AddressSearchModal
        visible={showAddressSearch}
        onSelect={(result) => setSelectedPlace(result)}
        onClose={() => setShowAddressSearch(false)}
      />

      {/* 날짜 피커 (iOS 모달) */}
      {Platform.OS === 'ios' && (
        <Modal transparent animationType="fade" visible={showDatePicker}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 20,
                padding: 16,
                width: '90%',
                alignItems: 'center',
              }}
            >
              <DateTimePicker
                value={date}
                mode="date"
                display="inline"
                onChange={onDateChange}
                maximumDate={new Date()}
                locale="ko-KR"
                accentColor="#5C3D2E"
                style={{ width: '100%' }}
              />
              <TouchableOpacity
                style={{
                  marginTop: 8,
                  backgroundColor: '#5C3D2E',
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 32,
                }}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>확인</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="calendar"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

// ── Step 1: 사진 ──────────────────────────────────────
function Step1({
  notePhotos,
  cafePhotos,
  scanningNote,
  scanningCafe,
  onAddNotePhoto,
  onRemoveNotePhoto,
  onAddCafePhoto,
  onRemoveCafePhoto,
}: {
  notePhotos: string[];
  cafePhotos: string[];
  scanningNote: boolean;
  scanningCafe: boolean;
  onAddNotePhoto: () => void;
  onRemoveNotePhoto: (i: number) => void;
  onAddCafePhoto: () => void;
  onRemoveCafePhoto: (i: number) => void;
}) {
  const noteSlots = [0, 1];

  return (
    <View style={{ gap: 24 }}>
      {/* 노트 사진 */}
      <Section label="노트 사진" hint="원두 카드 앞면/뒷면 · 최대 2장 · 선택">
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {noteSlots.map((i) => {
            const uri = notePhotos[i];
            if (uri) {
              return (
                <View key={i} style={{ position: 'relative' }}>
                  <Image
                    source={{ uri }}
                    style={{ width: 120, height: 160, borderRadius: 12 }}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      backgroundColor: 'rgba(0,0,0,0.52)',
                      borderRadius: 12,
                      padding: 2,
                    }}
                    onPress={() => onRemoveNotePhoto(i)}
                  >
                    <Ionicons name="close" size={15} color="#fff" />
                  </TouchableOpacity>
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 6,
                      left: 6,
                      backgroundColor: 'rgba(0,0,0,0.45)',
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                      {i === 0 ? '앞면' : '뒷면'}
                    </Text>
                  </View>
                </View>
              );
            }
            if (i === 0 || notePhotos.length >= 1) {
              return (
                <TouchableOpacity
                  key={i}
                  onPress={onAddNotePhoto}
                  disabled={scanningNote}
                  style={{
                    width: 120,
                    height: 160,
                    borderRadius: 12,
                    backgroundColor: '#F0EBE5',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    borderWidth: 1.5,
                    borderColor: '#D6C4B0',
                    borderStyle: 'dashed',
                    opacity: scanningNote ? 0.5 : 1,
                  }}
                >
                  {scanningNote && i === notePhotos.length ? (
                    <ActivityIndicator color="#8B5E3C" />
                  ) : (
                    <>
                      <Ionicons name="add" size={26} color="#8B5E3C" />
                      <Text style={{ fontSize: 12, color: '#8B5E3C', fontWeight: '600' }}>
                        {i === 0 ? '앞면' : '뒷면'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            }
            return null;
          })}
        </View>
      </Section>

      {/* 카페/메뉴 사진 */}
      <Section label="카페 · 메뉴 사진" hint={`최대 10장 · 선택 (${cafePhotos.length}/10)`}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {cafePhotos.map((uri, i) => (
            <View key={i} style={{ position: 'relative' }}>
              <Image
                source={{ uri }}
                style={{ width: 100, height: 133, borderRadius: 10 }}
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
                onPress={() => onRemoveCafePhoto(i)}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {scanningCafe && (
            <View
              style={{
                width: 100,
                height: 133,
                borderRadius: 10,
                backgroundColor: '#EFEFEF',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <ActivityIndicator color="#5C3D2E" />
              <Text style={{ fontSize: 10, color: '#888' }}>스캔 중</Text>
            </View>
          )}
          {!scanningCafe && cafePhotos.length < 10 && (
            <TouchableOpacity
              onPress={onAddCafePhoto}
              style={{
                width: 100,
                height: 133,
                borderRadius: 10,
                backgroundColor: '#F0EBE5',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderWidth: 1.5,
                borderColor: '#D6C4B0',
                borderStyle: 'dashed',
              }}
            >
              <Ionicons name="add" size={24} color="#5C3D2E" />
              <Text style={{ fontSize: 11, color: '#5C3D2E', fontWeight: '600' }}>사진 추가</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Section>
    </View>
  );
}

// ── Step 2: 카페 ──────────────────────────────────────
function Step2({
  selectedPlace,
  visitedAt,
  nearbyPlaces,
  nearbyLoading,
  hasCoords,
  onSelectNearby,
  onOpenSearch,
  onClearPlace,
  onOpenDatePicker,
}: {
  selectedPlace: { name: string; address: string } | null;
  visitedAt: string;
  nearbyPlaces: NearbyPlace[];
  nearbyLoading: boolean;
  hasCoords: boolean;
  onSelectNearby: (p: NearbyPlace) => void;
  onOpenSearch: () => void;
  onClearPlace: () => void;
  onOpenDatePicker: () => void;
}) {
  function formatDistance(d?: string) {
    if (!d) return '';
    const n = Number(d);
    return n < 1000 ? `${n}m` : `${(n / 1000).toFixed(1)}km`;
  }

  return (
    <View style={{ gap: 24 }}>
      <Section label="카페 *">
        {selectedPlace ? (
          /* 선택된 카페 카드 */
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: '#5C3D2E',
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
              <TouchableOpacity onPress={onClearPlace} style={{ padding: 2, marginLeft: 8 }}>
                <Ionicons name="close-circle" size={20} color="#bbb" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={onOpenSearch}
              style={{ marginTop: 6, alignSelf: 'flex-start' }}
            >
              <Text style={{ fontSize: 12, color: '#5C3D2E', fontWeight: '600' }}>직접 검색</Text>
            </TouchableOpacity>
          </View>
        ) : hasCoords ? (
          /* 근처 카페 목록 */
          <View style={{ gap: 8 }}>
            {nearbyLoading ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 }}
              >
                <ActivityIndicator size="small" color="#5C3D2E" />
                <Text style={{ fontSize: 13, color: '#999' }}>
                  사진 위치로 근처 카페 검색 중...
                </Text>
              </View>
            ) : nearbyPlaces.length > 0 ? (
              <>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 }}
                >
                  <Ionicons name="location" size={13} color="#5C3D2E" />
                  <Text style={{ fontSize: 12, color: '#5C3D2E', fontWeight: '600' }}>
                    반경 500m 근처 카페
                  </Text>
                </View>
                {nearbyPlaces.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => onSelectNearby(p)}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#E5DDD5',
                      padding: 14,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: '#222' }}>
                        {p.place_name}
                      </Text>
                      {p.distance ? (
                        <Text style={{ fontSize: 12, color: '#5C3D2E', fontWeight: '500' }}>
                          {formatDistance(p.distance)}
                        </Text>
                      ) : null}
                    </View>
                    {p.road_address_name || p.address_name ? (
                      <Text style={{ fontSize: 12, color: '#999', marginTop: 3 }} numberOfLines={1}>
                        {p.road_address_name || p.address_name}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <Text
                style={{ fontSize: 13, color: '#aaa', textAlign: 'center', paddingVertical: 12 }}
              >
                근처 카페를 찾지 못했어요.
              </Text>
            )}
            <TouchableOpacity
              onPress={onOpenSearch}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#D6C4B0',
                borderStyle: 'dashed',
                marginTop: 4,
              }}
            >
              <Ionicons name="search" size={15} color="#8B5E3C" />
              <Text style={{ fontSize: 13, color: '#8B5E3C', fontWeight: '600' }}>직접 검색</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* GPS 없음 - 직접 검색 버튼 */
          <TouchableOpacity
            onPress={onOpenSearch}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 18,
              backgroundColor: '#fff',
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: '#D6C4B0',
              borderStyle: 'dashed',
            }}
          >
            <Ionicons name="search" size={18} color="#5C3D2E" />
            <Text style={{ fontSize: 15, color: '#5C3D2E', fontWeight: '600' }}>카페 검색</Text>
          </TouchableOpacity>
        )}
      </Section>

      <Section label="방문 날짜">
        <TouchableOpacity
          onPress={onOpenDatePicker}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 14,
            backgroundColor: '#fff',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E5DDD5',
          }}
        >
          <Text style={{ fontSize: 15, color: '#222' }}>{visitedAt}</Text>
          <Ionicons name="calendar-outline" size={18} color="#999" />
        </TouchableOpacity>
      </Section>
    </View>
  );
}

// ── Step 3: 커피 정보 ─────────────────────────────────
function Step3({
  analyzing,
  analyzed,
  onReanalyze,
  menuName,
  onMenuName,
  isBlend,
  onIsBlend,
  origin,
  onOrigin,
  farm,
  onFarm,
  variety,
  onVariety,
  process,
  onProcess,
  roastLevel,
  onRoastLevel,
  officialNotes,
  onOfficialNotes,
  myNotes,
  onMyNotes,
  acidity,
  onAcidity,
  nuttiness,
  onNuttiness,
  richness,
  onRichness,
  smoothness,
  onSmoothness,
  beans,
  onBeans,
}: {
  analyzing: boolean;
  analyzed: boolean;
  onReanalyze?: () => void;
  menuName: string;
  onMenuName: (v: string) => void;
  isBlend: number;
  onIsBlend: (v: number) => void;
  origin: string;
  onOrigin: (v: string) => void;
  farm: string;
  onFarm: (v: string) => void;
  variety: string;
  onVariety: (v: string) => void;
  process: string;
  onProcess: (v: string) => void;
  roastLevel: string;
  onRoastLevel: (v: string) => void;
  officialNotes: string[];
  onOfficialNotes: (v: string[]) => void;
  myNotes: string[];
  onMyNotes: (v: string[]) => void;
  acidity?: number;
  onAcidity: (v?: number) => void;
  nuttiness?: number;
  onNuttiness: (v?: number) => void;
  richness?: number;
  onRichness: (v?: number) => void;
  smoothness?: number;
  onSmoothness: (v?: number) => void;
  beans: HanddripNoteBean[];
  onBeans: (v: HanddripNoteBean[]) => void;
}) {
  return (
    <View style={{ gap: 20 }}>
      {/* 분석 상태 배너 */}
      {analyzing && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            padding: 14,
            backgroundColor: '#F0EBE5',
            borderRadius: 12,
          }}
        >
          <ActivityIndicator size="small" color="#8B5E3C" />
          <Text style={{ fontSize: 14, color: '#8B5E3C', fontWeight: '500' }}>
            노트 사진 분석 중...
          </Text>
        </View>
      )}
      {analyzed && !analyzing && onReanalyze && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 12,
            backgroundColor: '#F0EBE5',
            borderRadius: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="sparkles-outline" size={15} color="#8B5E3C" />
            <Text style={{ fontSize: 13, color: '#8B5E3C', fontWeight: '500' }}>
              자동 분석 완료
            </Text>
          </View>
          <TouchableOpacity onPress={onReanalyze}>
            <Text style={{ fontSize: 12, color: '#8B5E3C', fontWeight: '600' }}>재분석</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 메뉴명 */}
      <NoteInput label="메뉴명" value={menuName} onChange={onMenuName} />

      {/* 싱글/블랜드 토글 */}
      <View>
        <Text style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>원두 종류</Text>
        <View
          style={{
            flexDirection: 'row',
            borderRadius: 10,
            borderWidth: 1,
            borderColor: '#E5DDD5',
            overflow: 'hidden',
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              backgroundColor: isBlend === 0 ? '#5C3D2E' : '#fff',
            }}
            onPress={() => onIsBlend(0)}
          >
            <Text
              style={{ fontSize: 13, fontWeight: '600', color: isBlend === 0 ? '#fff' : '#999' }}
            >
              싱글 오리진
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              backgroundColor: isBlend === 1 ? '#5C3D2E' : '#fff',
            }}
            onPress={() => onIsBlend(1)}
          >
            <Text
              style={{ fontSize: 13, fontWeight: '600', color: isBlend === 1 ? '#fff' : '#999' }}
            >
              블랜드
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 원두 정보 */}
      {isBlend === 1 ? (
        <View style={{ gap: 12 }}>
          {beans.map((bean, idx) => (
            <BeanEditor
              key={idx}
              bean={bean}
              index={idx}
              onChange={(b) => onBeans(beans.map((x, i) => (i === idx ? b : x)))}
              onRemove={() => onBeans(beans.filter((_, i) => i !== idx))}
            />
          ))}
          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: '#C5B8AE',
              borderRadius: 10,
              paddingVertical: 12,
              alignItems: 'center',
            }}
            onPress={() => onBeans([...beans, {}])}
          >
            <Text style={{ fontSize: 13, color: '#999' }}>+ 원두 추가</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <NoteInput label="원산지" value={origin} onChange={onOrigin} />
          <NoteInput label="농장" value={farm} onChange={onFarm} />
          <NoteInput label="품종" value={variety} onChange={onVariety} />
          <NoteInput label="가공법" value={process} onChange={onProcess} />
        </View>
      )}

      <NoteInput label="로스팅" value={roastLevel} onChange={onRoastLevel} />
      <TagsInput label="공식 노트 (쉼표 구분)" value={officialNotes} onChange={onOfficialNotes} />
      <MyNotesInput value={myNotes} onChange={onMyNotes} />

      <View style={{ gap: 4 }}>
        <SliderRow label="산미" value={acidity} onChange={onAcidity} />
        <SliderRow label="고소함" value={nuttiness} onChange={onNuttiness} />
        <SliderRow label="진함" value={richness} onChange={onRichness} />
        <SliderRow label="부드러움" value={smoothness} onChange={onSmoothness} />
      </View>
    </View>
  );
}

// ── Step 4: 메모 ──────────────────────────────────────
function Step4({ memo, onMemo }: { memo: string; onMemo: (v: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, color: '#666' }}>한 줄 감상</Text>
      <TextInput
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#E5DDD5',
          padding: 14,
          fontSize: 15,
          color: '#222',
          minHeight: 120,
          textAlignVertical: 'top',
        }}
        value={memo}
        onChangeText={onMemo}
        placeholder="오늘의 커피 한 줄 감상..."
        placeholderTextColor="#C5B8AE"
        multiline
        numberOfLines={5}
      />
    </View>
  );
}

// ── BeanEditor (블랜드 전용) ───────────────────────────
function BeanEditor({
  bean,
  index,
  onChange,
  onRemove,
}: {
  bean: HanddripNoteBean;
  index: number;
  onChange: (b: HanddripNoteBean) => void;
  onRemove: () => void;
}) {
  return (
    <View
      style={{ borderWidth: 1, borderColor: '#E5DDD5', borderRadius: 12, padding: 14, gap: 12 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#666' }}>원두 {index + 1}</Text>
        <TouchableOpacity onPress={onRemove}>
          <Text style={{ fontSize: 13, color: '#E07070' }}>삭제</Text>
        </TouchableOpacity>
      </View>
      <NoteInput
        label="원산지"
        value={bean.origin}
        onChange={(v) => onChange({ ...bean, origin: v })}
      />
      <NoteInput label="농장" value={bean.farm} onChange={(v) => onChange({ ...bean, farm: v })} />
      <NoteInput
        label="품종"
        value={bean.variety}
        onChange={(v) => onChange({ ...bean, variety: v })}
      />
      <NoteInput
        label="가공법"
        value={bean.process}
        onChange={(v) => onChange({ ...bean, process: v })}
      />
      <View>
        <Text style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>비율 (%)</Text>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#E5DDD5',
            borderRadius: 10,
            padding: 10,
            fontSize: 14,
            color: '#222',
            backgroundColor: '#fff',
          }}
          keyboardType="numeric"
          value={bean.ratio != null ? String(bean.ratio) : ''}
          onChangeText={(v) => onChange({ ...bean, ratio: v ? Number(v) : undefined })}
          placeholder="선택"
          placeholderTextColor="#C5B8AE"
        />
      </View>
    </View>
  );
}

// ── Section 레이아웃 헬퍼 ─────────────────────────────
function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#333' }}>{label}</Text>
        {hint && <Text style={{ fontSize: 12, color: '#AAA' }}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}
