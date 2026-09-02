import { View, Text, TextInput } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { MyNotesInput } from './MyNotesInput';
import { SliderRow } from './SliderRow';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';

export function Step4() {
  const { photoMode, menuType, memo, myNotes, acidity, nuttiness, richness, smoothness, setField } =
    useCafeLogDraftStore(
      useShallow((state) => ({
        photoMode: state.photoMode,
        menuType: state.menuType,
        memo: state.memo,
        myNotes: state.myNotes,
        acidity: state.acidity,
        nuttiness: state.nuttiness,
        richness: state.richness,
        smoothness: state.smoothness,
        setField: state.setField,
      })),
    );
  const showSliders = photoMode === 'handdip' || menuType === 'coffee';

  return (
    <View className="gap-5">
      {photoMode === 'handdip' && (
        <MyNotesInput value={myNotes} onChange={(value) => setField('myNotes', value)} />
      )}

      {showSliders && (
        <View className="gap-1">
          <SliderRow
            label="산미"
            value={acidity}
            onChange={(value) => setField('acidity', value)}
          />
          <SliderRow
            label="고소함"
            value={nuttiness}
            onChange={(value) => setField('nuttiness', value)}
          />
          <SliderRow
            label="진함"
            value={richness}
            onChange={(value) => setField('richness', value)}
          />
          <SliderRow
            label="부드러움"
            value={smoothness}
            onChange={(value) => setField('smoothness', value)}
          />
        </View>
      )}

      <View className="gap-2">
        <Text className="text-[13px] text-coffee-tan">한 줄 감상</Text>
        <TextInput
          className="min-h-[120px] rounded-xl border border-coffee-border bg-white p-3.5 text-[15px] text-coffee"
          style={{ textAlignVertical: 'top' }}
          value={memo}
          onChangeText={(value) => setField('memo', value)}
          placeholder={
            photoMode === 'menu' ? '오늘의 메뉴 한 줄 감상...' : '오늘의 커피 한 줄 감상...'
          }
          placeholderTextColor="#C0C0C0"
          multiline
          numberOfLines={5}
        />
      </View>
    </View>
  );
}

// ── BeanEditor (블랜드 전용) ───────────────────────────
