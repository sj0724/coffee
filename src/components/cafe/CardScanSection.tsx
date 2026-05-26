import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { detectAndCrop } from '@/modules/document-scanner';
import {
  getModelState,
  onModelStateChange,
  isModelDownloaded,
  downloadModel,
  loadModel,
  analyzeCardImages,
  ModelState,
} from '@/src/services/visionLLM';
import type { HanddripNote } from '@/src/types';

const MAX_CARDS = 2;

type Props = {
  onAnalyzed: (data: Partial<HanddripNote>) => void;
};

export function CardScanSection({ onAnalyzed }: Props) {
  const [cards, setCards] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [modelState, setModelState] = useState<ModelState>(getModelState());
  const [downloadPct, setDownloadPct] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    // 컴포넌트 마운트 시 다운로드 여부 확인
    isModelDownloaded().then((downloaded) => {
      if (downloaded && getModelState() === 'not_downloaded') {
        // 파일은 있지만 아직 로드 안 된 상태
        setModelState('not_downloaded'); // 로드는 분석 요청 시 자동으로
      }
    });
    return onModelStateChange(setModelState);
  }, []);

  async function pickImage() {
    if (cards.length >= MAX_CARDS) return;

    Alert.alert('카드 사진 추가', undefined, [
      { text: '카메라', onPress: () => pickFromCamera() },
      { text: '갤러리', onPress: () => pickFromLibrary() },
      { text: '취소', style: 'cancel' },
    ]);
  }

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled) {
      addCard(result.assets[0].uri);
    }
  }

  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 접근 권한이 필요해요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled) {
      addCard(result.assets[0].uri);
    }
  }

  async function addCard(rawUri: string) {
    setScanning(true);
    try {
      const uri = await detectAndCrop(rawUri).catch(() => rawUri);
      setCards((prev) => [...prev, uri]);
    } finally {
      setScanning(false);
    }
  }

  function removeCard(index: number) {
    setCards((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAnalyze() {
    if (cards.length === 0) return;

    const downloaded = await isModelDownloaded();

    if (!downloaded) {
      Alert.alert(
        'AI 모델 다운로드',
        'Gemma 4 E2B 모델을 다운로드해야 해요.\n약 1.7GB, Wi-Fi 연결을 권장해요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '다운로드', onPress: startDownloadAndAnalyze },
        ],
      );
      return;
    }

    runAnalysis();
  }

  async function startDownloadAndAnalyze() {
    setDownloadPct(0);
    const ok = await downloadModel((pct) => setDownloadPct(pct));
    if (!ok) {
      Alert.alert('오류', '모델 다운로드에 실패했어요. 네트워크를 확인해주세요.');
      return;
    }
    runAnalysis();
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      if (modelState !== 'ready') {
        const ok = await loadModel();
        if (!ok) {
          Alert.alert('오류', '모델 로드에 실패했어요.');
          return;
        }
      }
      const result = await analyzeCardImages(cards);
      if (result) {
        onAnalyzed(result);
      } else {
        Alert.alert('분석 실패', '카드에서 정보를 읽지 못했어요. 이미지를 확인해주세요.');
      }
    } finally {
      setAnalyzing(false);
    }
  }

  const isDownloading = modelState === 'downloading';
  const isLoading = modelState === 'loading';
  const isBusy = scanning || analyzing || isDownloading || isLoading;

  return (
    <View className="gap-2 p-3 rounded-xl bg-coffee-cream border border-coffee-border">
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="scan-outline" size={15} color="#8B5E3C" />
        <Text className="text-[13px] font-semibold text-coffee">원두 카드 스캔</Text>
        <Text className="text-[11px] text-gray-400">(선택 · 최대 2장)</Text>
      </View>

      {/* 이미지 슬롯 */}
      <View className="flex-row gap-2">
        {cards.map((uri, i) => (
          <View key={i} style={{ position: 'relative' }}>
            <Image
              source={{ uri }}
              style={{ width: 80, height: 106, borderRadius: 8 }}
              contentFit="cover"
            />
            {!isBusy && (
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  borderRadius: 10,
                  padding: 1,
                }}
                onPress={() => removeCard(i)}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {scanning && (
          <View
            style={{
              width: 80,
              height: 106,
              borderRadius: 8,
              backgroundColor: '#EFEFEF',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            <ActivityIndicator size="small" color="#8B5E3C" />
            <Text style={{ fontSize: 10, color: '#888' }}>크롭 중</Text>
          </View>
        )}

        {!scanning && cards.length < MAX_CARDS && (
          <TouchableOpacity
            onPress={pickImage}
            disabled={isBusy}
            style={{
              width: 80,
              height: 106,
              borderRadius: 8,
              backgroundColor: '#F5F0EB',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              borderWidth: 1.5,
              borderColor: '#D6C4B0',
              borderStyle: 'dashed',
              opacity: isBusy ? 0.4 : 1,
            }}
          >
            <Ionicons name="add" size={22} color="#8B5E3C" />
            <Text style={{ fontSize: 11, color: '#8B5E3C', fontWeight: '600' }}>
              {cards.length === 0 ? '앞면' : '뒷면'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 상태 메시지 / 분석 버튼 */}
      {isDownloading && (
        <View className="gap-1">
          <View className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <View
              className="h-full rounded-full bg-coffee"
              style={{ width: `${downloadPct}%` }}
            />
          </View>
          <Text className="text-[11px] text-gray-400 text-center">
            모델 다운로드 중... {downloadPct}%
          </Text>
        </View>
      )}

      {isLoading && (
        <View className="flex-row items-center justify-center gap-2 py-1">
          <ActivityIndicator size="small" color="#8B5E3C" />
          <Text className="text-[12px] text-coffee">모델 로딩 중...</Text>
        </View>
      )}

      {analyzing && (
        <View className="flex-row items-center justify-center gap-2 py-1">
          <ActivityIndicator size="small" color="#8B5E3C" />
          <Text className="text-[12px] text-coffee">Gemma 분석 중...</Text>
        </View>
      )}

      {!isBusy && cards.length > 0 && (
        <TouchableOpacity
          className="flex-row items-center justify-center gap-1.5 py-2 rounded-lg bg-coffee"
          onPress={handleAnalyze}
        >
          <Ionicons name="sparkles-outline" size={14} color="#fff" />
          <Text className="text-[13px] font-semibold text-white">자동 분석</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
