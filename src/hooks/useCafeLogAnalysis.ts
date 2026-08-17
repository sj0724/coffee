import { useState } from 'react';
import { analyzeCardImages } from '@/src/services/visionLLM';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';

export const useCafeLogAnalysis = () => {
  const [analyzing, setAnalyzing] = useState(false);
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

  return { analyzing, runCardAnalysis };
};
