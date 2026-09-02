import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import { Section } from './CafeLogFormSection';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';

export function Step1({
  scanningNote,
  onAddNotePhoto,
  onAddCafePhoto,
}: {
  scanningNote: boolean;
  onAddNotePhoto: () => void;
  onAddCafePhoto: () => void;
}) {
  const { photoMode, notePhotos, cafePhotos, setField } = useCafeLogDraftStore(
    useShallow((state) => ({
      photoMode: state.photoMode,
      notePhotos: state.notePhotos,
      cafePhotos: state.cafePhotos,
      setField: state.setField,
    })),
  );
  const noteSlots = [0, 1];

  const removeNotePhoto = (index: number) => {
    setField(
      'notePhotos',
      notePhotos.filter((_, photoIndex) => photoIndex !== index),
    );
  };

  const removeCafePhoto = (index: number) => {
    setField(
      'cafePhotos',
      cafePhotos.filter((_, photoIndex) => photoIndex !== index),
    );
  };

  return (
    <View className="gap-6">
      {/* 노트 사진 (핸드드립 모드) */}
      {photoMode === 'handdip' && (
        <Section label="노트 사진" hint="원두 카드 앞면/뒷면 · 최대 2장 · 선택">
          <View className="flex-row gap-3">
            {noteSlots.map((i) => {
              const uri = notePhotos[i];
              if (uri) {
                return (
                  <View key={i} className="relative">
                    <Image
                      source={{ uri }}
                      className="h-40 w-[120px] rounded-xl"
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      className="absolute right-1.5 top-1.5 rounded-xl bg-black/[0.52] p-0.5"
                      onPress={() => removeNotePhoto(i)}
                    >
                      <Ionicons name="close" size={15} color="#fff" />
                    </TouchableOpacity>
                    <View className="absolute bottom-1.5 left-1.5 rounded-md bg-black/[0.45] px-1.5 py-0.5">
                      <Text className="text-[10px] font-semibold text-white">
                        {i === 0 ? '앞면' : '뒷면'}
                      </Text>
                    </View>
                  </View>
                );
              }
              if (i === 0 || notePhotos.length >= 1) {
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={onAddNotePhoto}
                    disabled={scanningNote}
                    className="h-40 w-[120px] items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-coffee-border bg-[#F1F2F4]"
                    style={{ opacity: scanningNote ? 0.5 : 1 }}
                  >
                    {scanningNote && i === notePhotos.length ? (
                      <ActivityIndicator color="#5F636B" />
                    ) : (
                      <>
                        <Ionicons name="add" size={26} color="#5F636B" />
                        <Text className="text-xs font-semibold text-coffee-tan">
                          {i === 0 ? '앞면' : '뒷면'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              }
              return null;
            })}
          </View>
        </Section>
      )}

      {/* 카페 및 메뉴 사진 */}
      <Section label="카페 및 음료 사진" hint={`최대 10장 · 선택 (${cafePhotos.length}/10)`}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {cafePhotos.map((uri, i) => (
            <View key={i} className="relative">
              <Image
                source={{ uri }}
                className="h-[133px] w-[100px] rounded-[10px] bg-[#F1F2F4]"
                contentFit="contain"
              />
              <TouchableOpacity
                className="absolute right-[5px] top-[5px] rounded-xl bg-black/[0.52] p-0.5"
                onPress={() => removeCafePhoto(i)}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {cafePhotos.length < 10 && (
            <TouchableOpacity
              onPress={onAddCafePhoto}
              className="h-[133px] w-[100px] items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-coffee-border bg-[#F1F2F4]"
            >
              <Ionicons name="add" size={24} color="#101114" />
              <Text className="text-[11px] font-semibold text-coffee">사진 추가</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Section>
    </View>
  );
}

// ── Step 2: 카페 ──────────────────────────────────────
