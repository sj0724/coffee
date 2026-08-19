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
  onRequestAnalysis: () => void;
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
      onRequestAnalysis();
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
          onPress={handleNext}
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
          disabled={disabled}
          style={{
            backgroundColor: disabled ? '#C0C0C0' : '#3A1B0F',
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
  );
}
