import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createCafeLog } from '@/src/db/queries/cafeLogs';
import { createMenuItem } from '@/src/db/queries/cafeMenuItems';
import { upsertTastingNote } from '@/src/db/queries/tastingNotes';
import { AddressSearchModal } from '@/src/components/AddressSearchModal';
import { detectAndCrop } from '@/modules/document-scanner';
import { analyzeCardImages, analyzeMenuPhoto } from '@/src/services/visionLLM';
import { Step1 } from '@/src/components/cafe/CafeLogStepOne';
import { Step2 } from '@/src/components/cafe/CafeLogStepTwo';
import { Step3 } from '@/src/components/cafe/CafeLogStepThree';
import { Step4 } from '@/src/components/cafe/CafeLogStepFour';
import type { NearbyPlace } from '@/src/components/cafe/cafeLogFormTypes';
import { AnalysisOverlay } from '@/src/components/cafe/AnalysisOverlay';
import type { HanddripNoteBean } from '@/src/types';

const KAKAO_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

const TOTAL_STEPS = 4;

export default function NewCafeLogScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  const [step, setStep] = useState(1);

  // Step 1 - 사진
  const [photoMode, setPhotoMode] = useState<'handdip' | 'menu'>('handdip');
  const [notePhotos, setNotePhotos] = useState<string[]>([]);
  const [menuPhoto, setMenuPhoto] = useState<string | null>(null);
  const [menuNotDrink, setMenuNotDrink] = useState(false);
  const [isCoffeeDrink, setIsCoffeeDrink] = useState(true);
  const [cafePhotos, setCafePhotos] = useState<string[]>([]);
  const [scanningNote, setScanningNote] = useState(false);

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
  const nextDisabled =
    (step === 2 && !selectedPlace) || (step === 3 && photoMode === 'menu' && !menuName.trim());

  // 분석 중 화면 이탈 차단 (iOS 스와이프, Android 뒤로가기)
  useEffect(() => {
    if (!analyzing) return;
    const unsub = navigation.addListener('beforeRemove', (e: { preventDefault: () => void }) => {
      e.preventDefault();
    });
    return unsub;
  }, [analyzing, navigation]);

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
    if (step !== 3 || analyzed) return;
    if (photoMode === 'handdip' && notePhotos.length > 0) runAnalysis();
    else if (photoMode === 'menu' && menuPhoto) runMenuAnalysis();
  }, [step]);

  async function runMenuAnalysis() {
    if (!menuPhoto) return;
    setAnalyzing(true);
    setMenuNotDrink(false);
    try {
      const result = await analyzeMenuPhoto(menuPhoto);
      if (!result || !result.is_drink) {
        setMenuNotDrink(true);
      } else {
        if (result.menu_name) setMenuName(result.menu_name);
        setIsCoffeeDrink(result.is_coffee);
      }
    } finally {
      setAnalyzing(false);
      setAnalyzed(true);
    }
  }

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
    if (analyzing) return;
    if (step > 1) setStep((s) => s - 1);
    else router.back();
  }

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

  function switchPhotoMode(mode: 'handdip' | 'menu') {
    if (mode === 'handdip') {
      setMenuPhoto(null);
      setMenuName('');
    } else {
      setNotePhotos([]);
      setAnalyzed(false);
    }
    setPhotoMode(mode);
  }

  async function pickMenuPhoto() {
    Alert.alert('메뉴 사진', undefined, [
      { text: '카메라', onPress: pickMenuFromCamera },
      { text: '갤러리', onPress: pickMenuFromLibrary },
      { text: '취소', style: 'cancel' },
    ]);
  }

  async function pickMenuFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled) addMenuPhoto(result.assets[0].uri);
  }

  async function pickMenuFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 접근 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled) addMenuPhoto(result.assets[0].uri);
  }

  async function addMenuPhoto(uri: string) {
    setMenuPhoto(uri);
    setAnalyzed(false);
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
      setCafePhotos((prev) => [...prev, result.assets[0].uri]);
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
      setCafePhotos((prev) => [...prev, ...result.assets.map((asset) => asset.uri)]);
    }
  }

  async function handleSave() {
    if (!selectedPlace) return;
    setSaving(true);
    try {
      const logId = await createCafeLog({
        cafe_name: selectedPlace.name,
        visited_at: visitedAt,
        photos: (() => {
          const all = [menuPhoto, ...cafePhotos].filter(Boolean) as string[];
          return all.length > 0 ? JSON.stringify(all) : undefined;
        })(),
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
          menu_name: menuName.trim() || (photoMode === 'handdip' ? '핸드드립' : '커피'),
          is_coffee: photoMode === 'menu' ? (isCoffeeDrink ? 1 : 0) : null,
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

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      {/* 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <TouchableOpacity onPress={goBack} style={{ padding: 4, marginRight: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#222' }}>
          새 카페 기록
        </Text>
      </View>

      {/* 진행률 바 */}
      <View
        style={{
          height: 3,
          backgroundColor: '#E5E5E5',
          marginHorizontal: 16,
          borderRadius: 2,
          marginVertical: 16,
        }}
      >
        <Animated.View
          style={{
            height: 3,
            backgroundColor: '#000',
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
              photoMode={photoMode}
              onSwitchMode={switchPhotoMode}
              notePhotos={notePhotos}
              menuPhoto={menuPhoto}
              cafePhotos={cafePhotos}
              scanningNote={scanningNote}
              onAddNotePhoto={pickNotePhoto}
              onRemoveNotePhoto={(i) => setNotePhotos((p) => p.filter((_, idx) => idx !== i))}
              onAddMenuPhoto={pickMenuPhoto}
              onRemoveMenuPhoto={() => {
                setMenuPhoto(null);
                setMenuName('');
              }}
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
              menuNotDrink={menuNotDrink}
              photoMode={photoMode}
              onReanalyze={
                photoMode === 'handdip' && notePhotos.length > 0
                  ? runAnalysis
                  : photoMode === 'menu' && menuPhoto
                    ? runMenuAnalysis
                    : undefined
              }
              menuName={menuName}
              onMenuName={setMenuName}
              isCoffeeDrink={isCoffeeDrink}
              onIsCoffeeDrink={setIsCoffeeDrink}
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
              beans={beans}
              onBeans={setBeans}
            />
          )}
          {step === 4 && (
            <Step4
              photoMode={photoMode}
              isCoffeeDrink={isCoffeeDrink}
              memo={memo}
              onMemo={setMemo}
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
            />
          )}
        </ScrollView>

        {/* 하단 버튼 */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 16,
            paddingTop: 12,
            backgroundColor: '#fff',
          }}
        >
          {step < TOTAL_STEPS ? (
            <TouchableOpacity
              onPress={goNext}
              disabled={nextDisabled}
              style={{
                backgroundColor: nextDisabled ? '#C0C0C0' : '#111',
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
                backgroundColor: saving || !selectedPlace ? '#C0C0C0' : '#111',
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
                accentColor="#000"
                style={{ width: '100%' }}
              />
              <TouchableOpacity
                style={{
                  marginTop: 8,
                  backgroundColor: '#111',
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

      {/* 분석 오버레이 */}
      <AnalysisOverlay visible={analyzing} mode={photoMode} />
    </View>
  );
}
