import { View, TouchableOpacity, Text, TextInput } from 'react-native';
import { HanddripNote, HanddripNoteBean } from '@/src/types';
import { NoteInput } from './NoteInput';
import { TagsInput } from './TagsInput';
import { MyNotesInput } from './MyNotesInput';
import { SliderRow } from './SliderRow';

function BeanEditor({
  bean,
  index,
  onChange,
  onRemove,
}: {
  bean: HanddripNoteBean;
  index: number;
  onChange: (b: HanddripNoteBean) => void;
  onRemove: () => void;
}) {
  return (
    <View className="border border-gray-200 rounded-lg p-3 gap-2">
      <View className="flex-row justify-between items-center">
        <Text className="text-[13px] font-semibold text-gray-500">원두 {index + 1}</Text>
        <TouchableOpacity onPress={onRemove}>
          <Text className="text-[13px] text-red-400">삭제</Text>
        </TouchableOpacity>
      </View>
      <NoteInput
        label="원산지"
        value={bean.origin}
        onChange={(v) => onChange({ ...bean, origin: v })}
      />
      <NoteInput
        label="품종"
        value={bean.variety}
        onChange={(v) => onChange({ ...bean, variety: v })}
      />
      <NoteInput
        label="가공법"
        value={bean.process}
        onChange={(v) => onChange({ ...bean, process: v })}
      />
      <View className="flex-row items-center gap-2">
        <Text className="text-[13px] text-gray-500 w-[60px]">비율 (%)</Text>
        <TextInput
          className="flex-1 border-b border-gray-200 py-1 text-[14px] text-[#333]"
          keyboardType="numeric"
          value={bean.ratio != null ? String(bean.ratio) : ''}
          onChangeText={(v) => onChange({ ...bean, ratio: v ? Number(v) : undefined })}
          placeholder="선택"
          placeholderTextColor="#ccc"
        />
      </View>
    </View>
  );
}

export function NoteForm({
  form,
  onChange,
  onSave,
}: {
  form: Partial<HanddripNote>;
  onChange: (f: Partial<HanddripNote>) => void;
  onSave: () => void;
}) {
  const isBlend = !!form.is_blend;
  const beans = form.beans ?? [];

  function toggleBlend(blend: boolean) {
    onChange({ ...form, is_blend: blend ? 1 : 0, beans: blend ? (beans.length ? beans : [{}]) : [] });
  }

  function addBean() {
    onChange({ ...form, beans: [...beans, {}] });
  }

  function updateBean(index: number, bean: HanddripNoteBean) {
    const next = beans.map((b, i) => (i === index ? bean : b));
    onChange({ ...form, beans: next });
  }

  function removeBean(index: number) {
    const next = beans.filter((_, i) => i !== index);
    onChange({ ...form, beans: next });
  }

  return (
    <View className="gap-3 mt-1">
      {/* 싱글 오리진 / 블랜드 토글 */}
      <View className="flex-row rounded-lg border border-gray-200 overflow-hidden">
        <TouchableOpacity
          className={`flex-1 py-2 items-center ${!isBlend ? 'bg-coffee' : 'bg-white'}`}
          onPress={() => toggleBlend(false)}
        >
          <Text className={`text-[13px] font-semibold ${!isBlend ? 'text-white' : 'text-gray-400'}`}>
            싱글 오리진
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 items-center ${isBlend ? 'bg-coffee' : 'bg-white'}`}
          onPress={() => toggleBlend(true)}
        >
          <Text className={`text-[13px] font-semibold ${isBlend ? 'text-white' : 'text-gray-400'}`}>
            블랜드
          </Text>
        </TouchableOpacity>
      </View>

      {/* 원두 정보 */}
      {isBlend ? (
        <View className="gap-2">
          {beans.map((bean, idx) => (
            <BeanEditor
              key={idx}
              bean={bean}
              index={idx}
              onChange={(b) => updateBean(idx, b)}
              onRemove={() => removeBean(idx)}
            />
          ))}
          <TouchableOpacity
            className="border border-dashed border-gray-300 rounded-lg py-2.5 items-center"
            onPress={addBean}
          >
            <Text className="text-[13px] text-gray-400">+ 원두 추가</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <NoteInput
            label="원산지"
            value={form.origin}
            onChange={(v) => onChange({ ...form, origin: v })}
          />
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
      <TagsInput
        label="공식 노트 (쉼표 구분)"
        value={form.official_notes}
        onChange={(tags) => onChange({ ...form, official_notes: tags })}
      />
      <MyNotesInput
        value={form.my_notes}
        onChange={(tags) => onChange({ ...form, my_notes: tags })}
      />
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
      <TouchableOpacity className="items-center p-3 rounded-lg bg-coffee" onPress={onSave}>
        <Text className="font-bold text-white">저장</Text>
      </TouchableOpacity>
    </View>
  );
}
