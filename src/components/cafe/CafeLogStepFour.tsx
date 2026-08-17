import { View, Text, TextInput } from 'react-native';
import { MyNotesInput } from './MyNotesInput';
import { SliderRow } from './SliderRow';

export function Step4({
  photoMode,
  isCoffeeDrink,
  memo,
  onMemo,
  myNotes,
  onMyNotes,
  acidity,
  onAcidity,
  nuttiness,
  onNuttiness,
  richness,
  onRichness,
  smoothness,
  onSmoothness,
}: {
  photoMode: 'handdip' | 'menu';
  isCoffeeDrink: boolean;
  memo: string;
  onMemo: (v: string) => void;
  myNotes: string[];
  onMyNotes: (v: string[]) => void;
  acidity?: number;
  onAcidity: (v?: number) => void;
  nuttiness?: number;
  onNuttiness: (v?: number) => void;
  richness?: number;
  onRichness: (v?: number) => void;
  smoothness?: number;
  onSmoothness: (v?: number) => void;
}) {
  const showSliders = photoMode === 'handdip' || isCoffeeDrink;

  return (
    <View style={{ gap: 20 }}>
      {photoMode === 'handdip' && <MyNotesInput value={myNotes} onChange={onMyNotes} />}

      {showSliders && (
        <View style={{ gap: 4 }}>
          <SliderRow label="산미" value={acidity} onChange={onAcidity} />
          <SliderRow label="고소함" value={nuttiness} onChange={onNuttiness} />
          <SliderRow label="진함" value={richness} onChange={onRichness} />
          <SliderRow label="부드러움" value={smoothness} onChange={onSmoothness} />
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 13, color: '#816F62' }}>한 줄 감상</Text>
        <TextInput
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#C8BFB0',
            padding: 14,
            fontSize: 15,
            color: '#3A1B0F',
            minHeight: 120,
            textAlignVertical: 'top',
          }}
          value={memo}
          onChangeText={onMemo}
          placeholder="오늘의 커피 한 줄 감상..."
          placeholderTextColor="#C0C0C0"
          multiline
          numberOfLines={5}
        />
      </View>
    </View>
  );
}

// ── BeanEditor (블랜드 전용) ───────────────────────────
