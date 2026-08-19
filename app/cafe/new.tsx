import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { AddressSearchModal } from '@/src/components/AddressSearchModal';
import { Step1 } from '@/src/components/cafe/CafeLogStepOne';
import { Step2 } from '@/src/components/cafe/CafeLogStepTwo';
import { Step3 } from '@/src/components/cafe/CafeLogStepThree';
import { Step4 } from '@/src/components/cafe/CafeLogStepFour';
import { CafeLogTypePicker } from '@/src/components/cafe/CafeLogTypePicker';
import { AnalysisOverlay } from '@/src/components/cafe/AnalysisOverlay';
import { AiAnalysisConsentModal } from '@/src/components/cafe/AiAnalysisConsentModal';
import { CafeLogBottomActions } from '@/src/components/cafe/CafeLogBottomActions';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';
import { useCafeLogPhotos } from '@/src/hooks/useCafeLogPhotos';
import { useCafeLogAnalysis } from '@/src/hooks/useCafeLogAnalysis';

const TOTAL_STEPS = 4;

const NewCafeLogScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;
  const stageOpacity = useRef(new Animated.Value(1)).current;
  const stageTranslateX = useRef(new Animated.Value(0)).current;
  const stageTransitioning = useRef(false);

  const {
    step,
    recordTypeSelected,
    photoMode,
    notePhotos,
    setField,
    updateRecordType,
    resetDraft,
  } = useCafeLogDraftStore(
    useShallow((state) => ({
      step: state.step,
      recordTypeSelected: state.recordTypeSelected,
      photoMode: state.photoMode,
      notePhotos: state.notePhotos,
      setField: state.setField,
      updateRecordType: state.selectRecordType,
      resetDraft: state.resetDraft,
    })),
  );

  const { scanningNote, pickNotePhoto, pickCafePhoto } = useCafeLogPhotos();
  const { analyzing, runCardAnalysis } = useCafeLogAnalysis();
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const [showAiConsent, setShowAiConsent] = useState(false);
  const [analysisAfterStepChange, setAnalysisAfterStepChange] = useState(false);

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

  const moveToNextStep = () => {
    if (step < TOTAL_STEPS) transitionStage(() => setField('step', step + 1), 'forward');
  };

  const requestAnalysisBeforeNext = () => {
    setAnalysisAfterStepChange(true);
    setShowAiConsent(true);
  };

  const requestReanalysis = () => {
    setAnalysisAfterStepChange(false);
    setShowAiConsent(true);
  };

  const handleAiAnalysisAgree = () => {
    setShowAiConsent(false);
    if (analysisAfterStepChange) {
      moveToNextStep();
      setTimeout(() => void runCardAnalysis(), 300);
    } else {
      void runCardAnalysis();
    }
  };

  const handleAiAnalysisSkip = () => {
    setShowAiConsent(false);
    if (analysisAfterStepChange) moveToNextStep();
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
                    scanningNote={scanningNote}
                    onAddNotePhoto={pickNotePhoto}
                    onAddCafePhoto={pickCafePhoto}
                  />
                )}
                {step === 2 && <Step2 onOpenSearch={() => setShowAddressSearch(true)} />}
                {step === 3 && (
                  <Step3
                    analyzing={analyzing}
                    onReanalyze={
                      photoMode === 'handdip' && notePhotos.length > 0
                        ? requestReanalysis
                        : undefined
                    }
                  />
                )}
                {step === 4 && <Step4 />}
              </ScrollView>

              <CafeLogBottomActions
                onMoveNext={moveToNextStep}
                onRequestAnalysis={requestAnalysisBeforeNext}
              />
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

      {/* 분석 오버레이 */}
      <AnalysisOverlay visible={analyzing} mode={photoMode} />
      <AiAnalysisConsentModal
        visible={showAiConsent}
        onAgree={handleAiAnalysisAgree}
        onSkip={handleAiAnalysisSkip}
      />
    </View>
  );
};

export default NewCafeLogScreen;
