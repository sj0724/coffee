import { View, Text, TouchableOpacity } from 'react-native';
import { CafeTastingNote, MenuCategory } from '@/src/types';
import { NoteInput } from './NoteInput';
import { TagsInput } from './TagsInput';
import { MyNotesInput } from './MyNotesInput';
import { SliderRow } from './SliderRow';

export function NoteForm({
  category,
  form,
  onChange,
  onSave,
}: {
  category: MenuCategory;
  form: Partial<CafeTastingNote>;
  onChange: (f: Partial<CafeTastingNote>) => void;
  onSave: () => void;
}) {
  return (
    <View className="gap-3 mt-1">
      {(category === 'handdip' || category === 'espresso') && (
        <>
          <NoteInput
            label="원산지"
            value={form.origin}
            onChange={(v) => onChange({ ...form, origin: v })}
          />
          {category === 'handdip' && (
            <>
              <NoteInput
                label="품종"
                value={form.variety}
                onChange={(v) => onChange({ ...form, variety: v })}
              />
              <NoteInput
                label="가공법"
                value={form.process}
                onChange={(v) => onChange({ ...form, process: v })}
              />
            </>
          )}
          <NoteInput
            label="로스팅"
            value={form.roast_level}
            onChange={(v) => onChange({ ...form, roast_level: v })}
          />
        </>
      )}

      {category === 'espresso' && (
        <View>
          <Text className="text-[13px] text-[#666] mb-1">온도</Text>
          <View className="flex-row gap-2">
            {['핫', '아이스'].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => onChange({ ...form, temperature: t })}
                className={`px-4 py-2 rounded-full border ${form.temperature === t ? 'bg-coffee border-coffee' : 'border-gray-200'}`}
              >
                <Text
                  className={`text-sm ${form.temperature === t ? 'text-white' : 'text-gray-400'}`}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {category === 'handdip' && (
        <TagsInput
          label="공식 노트 (쉼표 구분)"
          value={form.official_notes}
          onChange={(tags) => onChange({ ...form, official_notes: tags })}
        />
      )}

      <MyNotesInput
        value={form.my_notes}
        onChange={(tags) => onChange({ ...form, my_notes: tags })}
      />

      {category !== 'simple' && (
        <>
          <SliderRow
            label="산미"
            value={form.acidity}
            onChange={(v) => onChange({ ...form, acidity: v })}
          />
          <SliderRow
            label="고소함"
            value={form.nuttiness}
            onChange={(v) => onChange({ ...form, nuttiness: v })}
          />
          <SliderRow
            label="진함"
            value={form.richness}
            onChange={(v) => onChange({ ...form, richness: v })}
          />
          <SliderRow
            label="부드러움"
            value={form.smoothness}
            onChange={(v) => onChange({ ...form, smoothness: v })}
          />
        </>
      )}

      <TouchableOpacity className="items-center p-3 rounded-lg bg-coffee" onPress={onSave}>
        <Text className="font-bold text-white">저장</Text>
      </TouchableOpacity>
    </View>
  );
}
