import { useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';
import { saveCafeLogDraft } from '@/src/services/saveCafeLogDraft';

const TOTAL_STEPS = 4;

export function CafeLogBottomActions({
  onMoveNext,
  onRequestAnalysis,
}: {
  onMoveNext: () => void;
  onRequestAnalysis: () => void | Promise<void>;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const { step, photoMode, notePhotos, selectedPlace, analyzed, menuName, resetDraft } =
    useCafeLogDraftStore(
      useShallow((state) => ({
        step: state.step,
        photoMode: state.photoMode,
        notePhotos: state.notePhotos,
        selectedPlace: state.selectedPlace,
        analyzed: state.analyzed,
        menuName: state.menuName,
        resetDraft: state.resetDraft,
      })),
    );

  const nextDisabled =
    (step === 2 && !selectedPlace) || (step === 3 && photoMode === 'menu' && !menuName.trim());

  const handleNext = () => {
    if (step === 2 && photoMode === 'handdip' && notePhotos.length > 0 && !analyzed) {
      void onRequestAnalysis();
      return;
    }
    onMoveNext();
  };

  const handleSave = async () => {
    if (!selectedPlace) return;
    setSaving(true);
    try {
      const logId = await saveCafeLogDraft(useCafeLogDraftStore.getState());
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

  const disabled = saving || !selectedPlace;

  return (
    <View className="bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 16 }}>
      {step < TOTAL_STEPS ? (
        <TouchableOpacity
          onPress={handleNext}
          disabled={nextDisabled}
          className="items-center rounded-[14px] py-[15px]"
          style={{ backgroundColor: nextDisabled ? '#C0C0C0' : '#101114' }}
        >
          <Text className="text-base font-bold text-white">다음</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={handleSave}
          disabled={disabled}
          className="items-center rounded-[14px] py-[15px]"
          style={{ backgroundColor: disabled ? '#C0C0C0' : '#101114' }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-bold text-white">등록 완료</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
