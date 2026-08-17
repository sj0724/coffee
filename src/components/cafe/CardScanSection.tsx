import { useState } from 'react';
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
        <Ionicons name="scan-outline" size={15} color="#8B5E3C" />
        <Text className="text-[13px] font-semibold text-coffee">원두 카드 스캔</Text>
        <Text className="text-[11px] text-gray-400">(선택 · 최대 2장)</Text>
      </View>

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
            <Text style={{ fontSize: 10, color: '#8B7A6D' }}>크롭 중</Text>
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

      {analyzing && (
        <View className="flex-row items-center justify-center gap-2 py-1">
          <ActivityIndicator size="small" color="#8B5E3C" />
          <Text className="text-[12px] text-coffee">Gemini 분석 중...</Text>
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
