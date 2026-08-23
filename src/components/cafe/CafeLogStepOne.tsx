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
    <View style={{ gap: 24 }}>
      {/* 노트 사진 (핸드드립 모드) */}
      {photoMode === 'handdip' && (
        <Section label="노트 사진" hint="원두 카드 앞면/뒷면 · 최대 2장 · 선택">
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {noteSlots.map((i) => {
              const uri = notePhotos[i];
              if (uri) {
                return (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image
                      source={{ uri }}
                      style={{ width: 120, height: 160, borderRadius: 12 }}
                      contentFit="cover"
                    />
                    <TouchableOpacity
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        backgroundColor: 'rgba(0,0,0,0.52)',
                        borderRadius: 12,
                        padding: 2,
                      }}
                      onPress={() => removeNotePhoto(i)}
                    >
                      <Ionicons name="close" size={15} color="#fff" />
                    </TouchableOpacity>
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        left: 6,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        borderRadius: 6,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
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
                    style={{
                      width: 120,
                      height: 160,
                      borderRadius: 12,
                      backgroundColor: '#F1F2F4',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      borderWidth: 1.5,
                      borderColor: '#D8DADE',
                      borderStyle: 'dashed',
                      opacity: scanningNote ? 0.5 : 1,
                    }}
                  >
                    {scanningNote && i === notePhotos.length ? (
                      <ActivityIndicator color="#5F636B" />
                    ) : (
                      <>
                        <Ionicons name="add" size={26} color="#5F636B" />
                        <Text style={{ fontSize: 12, color: '#5F636B', fontWeight: '600' }}>
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
            <View key={i} style={{ position: 'relative' }}>
              <Image
                source={{ uri }}
                style={{ width: 100, height: 133, borderRadius: 10, backgroundColor: '#F1F2F4' }}
                contentFit="contain"
              />
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  top: 5,
                  right: 5,
                  backgroundColor: 'rgba(0,0,0,0.52)',
                  borderRadius: 12,
                  padding: 2,
                }}
                onPress={() => removeCafePhoto(i)}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {cafePhotos.length < 10 && (
            <TouchableOpacity
              onPress={onAddCafePhoto}
              style={{
                width: 100,
                height: 133,
                borderRadius: 10,
                backgroundColor: '#F1F2F4',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderWidth: 1.5,
                borderColor: '#D8DADE',
                borderStyle: 'dashed',
              }}
            >
              <Ionicons name="add" size={24} color="#101114" />
              <Text style={{ fontSize: 11, color: '#101114', fontWeight: '600' }}>사진 추가</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Section>
    </View>
  );
}

// ── Step 2: 카페 ──────────────────────────────────────
