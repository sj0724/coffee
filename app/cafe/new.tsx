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
  Easing,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddressSearchModal } from '@/src/components/AddressSearchModal';
import { Step1 } from '@/src/components/cafe/CafeLogStepOne';
import { Step2 } from '@/src/components/cafe/CafeLogStepTwo';
import { Step3 } from '@/src/components/cafe/CafeLogStepThree';
import { Step4 } from '@/src/components/cafe/CafeLogStepFour';
import { CafeLogTypePicker } from '@/src/components/cafe/CafeLogTypePicker';
import type { NearbyPlace } from '@/src/components/cafe/cafeLogFormTypes';
import { AnalysisOverlay } from '@/src/components/cafe/AnalysisOverlay';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';
import { useCafeLogPhotos } from '@/src/hooks/useCafeLogPhotos';
import { useCafeLogAnalysis } from '@/src/hooks/useCafeLogAnalysis';
import { saveCafeLogDraft } from '@/src/services/saveCafeLogDraft';

const KAKAO_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

const TOTAL_STEPS = 4;

const NewCafeLogScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;
  const stageOpacity = useRef(new Animated.Value(1)).current;
  const stageTranslateX = useRef(new Animated.Value(0)).current;
  const stageTransitioning = useRef(false);

  const draft = useCafeLogDraftStore();
  const { setField, selectRecordType: updateRecordType, resetDraft } = draft;
  const {
    step,
    recordTypeSelected,
    photoMode,
    notePhotos,
    menuType,
    cafePhotos,
    photoCoords,
    selectedPlace,
    visitedAt,
    analyzed,
    menuName,
    isBlend,
    origin,
    farm,
    variety,
    process,
    roastLevel,
    officialNotes,
    myNotes,
    acidity,
    nuttiness,
    richness,
    smoothness,
    beans,
    memo,
  } = draft;

  const { scanningNote, pickNotePhoto, pickCafePhoto } = useCafeLogPhotos();
  const { analyzing, runCardAnalysis } = useCafeLogAnalysis();
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const date = new Date(`${visitedAt}T00:00:00`);
  const nextDisabled =
    (step === 2 && !selectedPlace) || (step === 3 && photoMode === 'menu' && !menuName.trim());

  useEffect(() => resetDraft, [resetDraft]);

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

  const fetchNearby = async () => {
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
  };

  const transitionStage = (update: () => void, direction: 'forward' | 'back') => {
    if (stageTransitioning.current) return;
    stageTransitioning.current = true;

    Animated.parallel([
      Animated.timing(stageOpacity, {
        toValue: 0,
        duration: 100,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(stageTranslateX, {
        toValue: direction === 'forward' ? -14 : 14,
        duration: 100,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      update();
      stageTranslateX.setValue(direction === 'forward' ? 18 : -18);
      requestAnimationFrame(() => {
        Animated.parallel([
          Animated.timing(stageOpacity, {
            toValue: 1,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(stageTranslateX, {
            toValue: 0,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => {
          stageTransitioning.current = false;
        });
      });
    });
  };

  const goNext = () => {
    if (step < TOTAL_STEPS) transitionStage(() => setField('step', step + 1), 'forward');
  };

  const goBack = () => {
    if (analyzing || stageTransitioning.current) return;
    if (step > 1) transitionStage(() => setField('step', step - 1), 'back');
    else if (recordTypeSelected)
      transitionStage(() => setField('recordTypeSelected', false), 'back');
    else {
      resetDraft();
      router.back();
    }
  };

  const selectRecordType = (mode: 'handdip' | 'menu') => {
    transitionStage(() => updateRecordType(mode), 'forward');
  };

  const handleSave = async () => {
    if (!selectedPlace) return;
    setSaving(true);
    try {
      const logId = await saveCafeLogDraft(draft);
      if (logId == null) {
        Alert.alert('오류', '저장에 실패했어요.');
        return;
      }
      resetDraft();
      router.replace(`/cafe/${logId}`);
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selected) setField('visitedAt', selected.toISOString().slice(0, 10));
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top }}>
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
          <Ionicons name="chevron-back" size={24} color="#3A1B0F" />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: '#3A1B0F' }}>
          새 카페 기록
        </Text>
      </View>

      {recordTypeSelected && (
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
              backgroundColor: '#E6531E',
              borderRadius: 2,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>
      )}

      <Animated.View
        style={{
          flex: 1,
          opacity: stageOpacity,
          transform: [{ translateX: stageTranslateX }],
        }}
      >
        {!recordTypeSelected ? (
          <CafeLogTypePicker onSelect={selectRecordType} />
        ) : (
          <>
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
                    notePhotos={notePhotos}
                    cafePhotos={cafePhotos}
                    scanningNote={scanningNote}
                    onAddNotePhoto={pickNotePhoto}
                    onRemoveNotePhoto={(i) =>
                      setField(
                        'notePhotos',
                        notePhotos.filter((_, index) => index !== i),
                      )
                    }
                    onAddCafePhoto={pickCafePhoto}
                    onRemoveCafePhoto={(i) =>
                      setField(
                        'cafePhotos',
                        cafePhotos.filter((_, index) => index !== i),
                      )
                    }
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
                      setField('selectedPlace', {
                        name: p.place_name,
                        address: p.road_address_name || p.address_name,
                      })
                    }
                    onOpenSearch={() => setShowAddressSearch(true)}
                    onClearPlace={() => setField('selectedPlace', null)}
                    onOpenDatePicker={() => setShowDatePicker(true)}
                  />
                )}
                {step === 3 && (
                  <Step3
                    analyzing={analyzing}
                    analyzed={analyzed}
                    photoMode={photoMode}
                    onReanalyze={
                      photoMode === 'handdip' && notePhotos.length > 0 ? runCardAnalysis : undefined
                    }
                    menuName={menuName}
                    onMenuName={(value) => setField('menuName', value)}
                    menuType={menuType}
                    onMenuType={(value) => setField('menuType', value)}
                    isBlend={isBlend}
                    onIsBlend={(value) => setField('isBlend', value)}
                    origin={origin}
                    onOrigin={(value) => setField('origin', value)}
                    farm={farm}
                    onFarm={(value) => setField('farm', value)}
                    variety={variety}
                    onVariety={(value) => setField('variety', value)}
                    process={process}
                    onProcess={(value) => setField('process', value)}
                    roastLevel={roastLevel}
                    onRoastLevel={(value) => setField('roastLevel', value)}
                    officialNotes={officialNotes}
                    onOfficialNotes={(value) => setField('officialNotes', value)}
                    beans={beans}
                    onBeans={(value) => setField('beans', value)}
                  />
                )}
                {step === 4 && (
                  <Step4
                    photoMode={photoMode}
                    menuType={menuType}
                    memo={memo}
                    onMemo={(value) => setField('memo', value)}
                    myNotes={myNotes}
                    onMyNotes={(value) => setField('myNotes', value)}
                    acidity={acidity}
                    onAcidity={(value) => setField('acidity', value)}
                    nuttiness={nuttiness}
                    onNuttiness={(value) => setField('nuttiness', value)}
                    richness={richness}
                    onRichness={(value) => setField('richness', value)}
                    smoothness={smoothness}
                    onSmoothness={(value) => setField('smoothness', value)}
                  />
                )}
              </ScrollView>

              {/* 하단 버튼 */}
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingBottom: insets.bottom + 16,
                  paddingTop: 12,
                  backgroundColor: '#FFFFFF',
                }}
              >
                {step < TOTAL_STEPS ? (
                  <TouchableOpacity
                    onPress={goNext}
                    disabled={nextDisabled}
                    style={{
                      backgroundColor: nextDisabled ? '#C0C0C0' : '#3A1B0F',
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
                      backgroundColor: saving || !selectedPlace ? '#C0C0C0' : '#3A1B0F',
                      borderRadius: 14,
                      paddingVertical: 15,
                      alignItems: 'center',
                    }}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                        등록 완료
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </KeyboardAvoidingView>
          </>
        )}
      </Animated.View>

      {/* 카페 검색 모달 */}
      <AddressSearchModal
        visible={showAddressSearch}
        onSelect={(result) => setField('selectedPlace', result)}
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
                backgroundColor: '#FFFFFF',
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
                accentColor="#E6531E"
                style={{ width: '100%' }}
              />
              <TouchableOpacity
                style={{
                  marginTop: 8,
                  backgroundColor: '#E6531E',
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
};

export default NewCafeLogScreen;
