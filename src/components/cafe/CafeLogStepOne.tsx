import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Section } from './CafeLogFormSection';

export function Step1({
  photoMode,
  onSwitchMode,
  notePhotos,
  menuPhoto,
  cafePhotos,
  scanningNote,
  scanningCafe,
  onAddNotePhoto,
  onRemoveNotePhoto,
  onAddMenuPhoto,
  onRemoveMenuPhoto,
  onAddCafePhoto,
  onRemoveCafePhoto,
}: {
  photoMode: 'handdip' | 'menu';
  onSwitchMode: (mode: 'handdip' | 'menu') => void;
  notePhotos: string[];
  menuPhoto: string | null;
  cafePhotos: string[];
  scanningNote: boolean;
  scanningCafe: boolean;
  onAddNotePhoto: () => void;
  onRemoveNotePhoto: (i: number) => void;
  onAddMenuPhoto: () => void;
  onRemoveMenuPhoto: () => void;
  onAddCafePhoto: () => void;
  onRemoveCafePhoto: (i: number) => void;
}) {
  const noteSlots = [0, 1];

  return (
    <View style={{ gap: 24 }}>
      {/* 모드 토글 */}
      <View
        style={{
          flexDirection: 'row',
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#E0E0E0',
          overflow: 'hidden',
        }}
      >
        {(['handdip', 'menu'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={{
              flex: 1,
              paddingVertical: 11,
              alignItems: 'center',
              backgroundColor: photoMode === mode ? '#111' : '#fff',
            }}
            onPress={() => onSwitchMode(mode)}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: photoMode === mode ? '#fff' : '#999',
              }}
            >
              {mode === 'handdip' ? '핸드드립 / 스페셜티' : '일반 메뉴'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

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
                      onPress={() => onRemoveNotePhoto(i)}
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
                      backgroundColor: '#F5F5F5',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      borderWidth: 1.5,
                      borderColor: '#D0D0D0',
                      borderStyle: 'dashed',
                      opacity: scanningNote ? 0.5 : 1,
                    }}
                  >
                    {scanningNote && i === notePhotos.length ? (
                      <ActivityIndicator color="#555" />
                    ) : (
                      <>
                        <Ionicons name="add" size={26} color="#555" />
                        <Text style={{ fontSize: 12, color: '#555', fontWeight: '600' }}>
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

      {/* 메뉴 사진 (일반 메뉴 모드) */}
      {photoMode === 'menu' && (
        <Section label="메뉴 사진" hint="음료 사진 · 1장 · 선택 · 메뉴명 자동 인식">
          {menuPhoto ? (
            <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
              <Image
                source={{ uri: menuPhoto }}
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
                onPress={onRemoveMenuPhoto}
              >
                <Ionicons name="close" size={15} color="#fff" />
              </TouchableOpacity>
              <View
                style={{
                  position: 'absolute',
                  bottom: 6,
                  left: 6,
                  backgroundColor: 'rgba(92,61,46,0.85)',
                  borderRadius: 6,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>메뉴</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={onAddMenuPhoto}
              style={{
                width: 120,
                height: 160,
                borderRadius: 12,
                backgroundColor: '#F5F5F5',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderWidth: 1.5,
                borderColor: '#D0D0D0',
                borderStyle: 'dashed',
              }}
            >
              <>
                <Ionicons name="cafe-outline" size={26} color="#555" />
                <Text style={{ fontSize: 12, color: '#555', fontWeight: '600' }}>메뉴 사진</Text>
              </>
            </TouchableOpacity>
          )}
        </Section>
      )}

      {/* 카페 사진 */}
      <Section label="카페 사진" hint={`최대 10장 · 선택 (${cafePhotos.length}/10)`}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10 }}
        >
          {cafePhotos.map((uri, i) => (
            <View key={i} style={{ position: 'relative' }}>
              <Image
                source={{ uri }}
                style={{ width: 100, height: 133, borderRadius: 10 }}
                contentFit="cover"
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
                onPress={() => onRemoveCafePhoto(i)}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {scanningCafe && (
            <View
              style={{
                width: 100,
                height: 133,
                borderRadius: 10,
                backgroundColor: '#EFEFEF',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <ActivityIndicator color="#111" />
              <Text style={{ fontSize: 10, color: '#888' }}>스캔 중</Text>
            </View>
          )}
          {!scanningCafe && cafePhotos.length < 10 && (
            <TouchableOpacity
              onPress={onAddCafePhoto}
              style={{
                width: 100,
                height: 133,
                borderRadius: 10,
                backgroundColor: '#F5F5F5',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderWidth: 1.5,
                borderColor: '#D0D0D0',
                borderStyle: 'dashed',
              }}
            >
              <Ionicons name="add" size={24} color="#111" />
              <Text style={{ fontSize: 11, color: '#111', fontWeight: '600' }}>사진 추가</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Section>
    </View>
  );
}

// ── Step 2: 카페 ──────────────────────────────────────
