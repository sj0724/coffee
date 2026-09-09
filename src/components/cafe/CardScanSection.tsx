import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { analyzeCardImages } from '@/src/services/visionLLM';
import type { HanddripNote } from '@/src/types';

const MAX_CARDS = 2;

type Props = {
  onAnalyzed: (data: Partial<HanddripNote>) => void;
};

export function CardScanSection({ onAnalyzed }: Props) {
  const [cards, setCards] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const isBusy = scanning || analyzing;

  async function pickImage() {
    if (cards.length >= MAX_CARDS) return;

    Alert.alert('카드 사진 추가', undefined, [
      { text: '카메라', onPress: pickFromCamera },
      { text: '갤러리', onPress: pickFromLibrary },
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
    if (!result.canceled) addCard(result.assets[0].uri);
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
    if (!result.canceled) addCard(result.assets[0].uri);
  }

  async function addCard(rawUri: string) {
    setScanning(true);
    try {
      const { detectAndCrop } = await import('@/modules/document-scanner');
      const uri = await detectAndCrop(rawUri).catch(() => rawUri);
      setCards((prev) => [...prev, uri]);
    } catch {
      setCards((prev) => [...prev, rawUri]);
    } finally {
      setScanning(false);
    }
  }

  function removeCard(index: number) {
    setCards((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAnalyze() {
    if (cards.length === 0) return;
    setAnalyzing(true);
    try {
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

  return (
    <View className="gap-2 p-3 rounded-xl bg-coffee-cream border border-coffee-border">
      <View className="flex-row items-center gap-1.5">
        <Ionicons name="scan-outline" size={15} color="#123C96" />
        <Text className="text-[13px] font-semibold text-coffee">원두 카드 스캔</Text>
        <Text className="text-[13px] text-gray-400">(선택 · 최대 2장)</Text>
      </View>

      <View className="flex-row gap-2">
        {cards.map((uri, i) => (
          <View key={i} className="relative">
            <Image
              source={{ uri }}
              style={{ width: 80, height: 106, borderRadius: 8, backgroundColor: '#EFEFEF' }}
              resizeMode="contain"
              onError={(event) =>
                console.warn('Failed to load scanned card', uri, event.nativeEvent.error)
              }
            />
            {!isBusy && (
              <TouchableOpacity
                className="absolute right-1 top-1 rounded-[10px] bg-black/50 p-px"
                onPress={() => removeCard(i)}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        {scanning && (
          <View className="h-[106px] w-20 items-center justify-center gap-1 rounded-lg bg-[#EFEFEF]">
            <ActivityIndicator size="small" color="#123C96" />
            <Text className="text-[13px] text-coffee-soft">크롭 중</Text>
          </View>
        )}

        {!scanning && cards.length < MAX_CARDS && (
          <TouchableOpacity
            onPress={pickImage}
            disabled={isBusy}
            className="h-[106px] w-20 items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-coffee-border bg-[#F4F5F7]"
            style={{ opacity: isBusy ? 0.4 : 1 }}
          >
            <Ionicons name="add" size={22} color="#123C96" />
            <Text className="text-[13px] font-semibold text-accent">
              {cards.length === 0 ? '앞면' : '뒷면'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {analyzing && (
        <View className="flex-row items-center justify-center gap-2 py-1">
          <ActivityIndicator size="small" color="#123C96" />
          <Text className="text-[13px] text-coffee">Gemini 분석 중...</Text>
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
