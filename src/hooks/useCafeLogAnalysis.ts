import { useEffect, useState } from 'react';
import { analyzeCardImages, analyzeMenuPhoto } from '@/src/services/visionLLM';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';

export const useCafeLogAnalysis = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const { step, analyzed, photoMode, notePhotos, menuPhoto } = useCafeLogDraftStore();

  const runMenuAnalysis = async () => {
    const photo = useCafeLogDraftStore.getState().menuPhoto;
    if (!photo) return;
    setAnalyzing(true);
    useCafeLogDraftStore.getState().setField('menuNotDrink', false);
    try {
      const result = await analyzeMenuPhoto(photo);
      if (!result?.is_drink) {
        useCafeLogDraftStore.getState().setField('menuNotDrink', true);
      } else {
        useCafeLogDraftStore.getState().updateDraft({
          ...(result.menu_name ? { menuName: result.menu_name } : {}),
          isCoffeeDrink: result.is_coffee,
        });
      }
    } finally {
      setAnalyzing(false);
      useCafeLogDraftStore.getState().setField('analyzed', true);
    }
  };

  const runCardAnalysis = async () => {
    setAnalyzing(true);
    try {
      const result = await analyzeCardImages(useCafeLogDraftStore.getState().notePhotos);
      if (!result) return;
      useCafeLogDraftStore.getState().updateDraft({
        ...(result.is_blend !== undefined ? { isBlend: result.is_blend } : {}),
        ...(result.origin ? { origin: result.origin } : {}),
        ...(result.farm ? { farm: result.farm } : {}),
        ...(result.variety ? { variety: result.variety } : {}),
        ...(result.process ? { process: result.process } : {}),
        ...(result.roast_level ? { roastLevel: result.roast_level } : {}),
        ...(result.official_notes?.length ? { officialNotes: result.official_notes } : {}),
        ...(result.beans?.length ? { beans: result.beans } : {}),
      });
    } finally {
      setAnalyzing(false);
      useCafeLogDraftStore.getState().setField('analyzed', true);
    }
  };

  useEffect(() => {
    if (step !== 3 || analyzed) return;
    if (photoMode === 'handdip' && notePhotos.length > 0) void runCardAnalysis();
    if (photoMode === 'menu' && menuPhoto) void runMenuAnalysis();
  }, [step, analyzed, photoMode, notePhotos, menuPhoto]);

  return { analyzing, runCardAnalysis, runMenuAnalysis };
};
