import { useEffect, useRef, useState } from 'react';
import {
  analyzeCardImages,
  CardAnalysisError,
  type AnalysisOptions,
} from '@/src/services/visionLLM';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';

export const useCafeLogAnalysis = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const notePhotos = useCafeLogDraftStore((state) => state.notePhotos);
  useEffect(() => {
    setAnalysisError(null);
  }, [notePhotos]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runCardAnalysis = async (options: AnalysisOptions = {}) => {
    if (busy.current) return;
    busy.current = true;
    const photos = [...useCafeLogDraftStore.getState().notePhotos];
    const isCurrent = () =>
      mounted.current &&
      JSON.stringify(useCafeLogDraftStore.getState().notePhotos) === JSON.stringify(photos);
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await analyzeCardImages(photos, options);
      if (!isCurrent()) return;
      useCafeLogDraftStore.getState().updateDraft({
        isBlend: result.is_blend ?? 0,
        origin: result.origin ?? '',
        farm: result.farm ?? '',
        variety: result.variety ?? '',
        process: result.process ?? '',
        roastLevel: result.roast_level ?? '',
        roastery: result.roastery ?? '',
        officialNotes: result.official_notes ?? [],
        beans: result.beans ?? [],
        analyzed: true,
      });
    } catch (error) {
      if (!isCurrent()) return;
      useCafeLogDraftStore.getState().setField('analyzed', false);
      setAnalysisError(
        error instanceof CardAnalysisError
          ? error.message
          : '분석하지 못했어요. 다시 시도하거나 직접 입력해주세요.',
      );
    } finally {
      busy.current = false;
      if (mounted.current) setAnalyzing(false);
    }
  };

  return { analyzing, analysisError, runCardAnalysis };
};
