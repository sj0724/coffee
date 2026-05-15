import { View, Text } from 'react-native';
import { CafeTastingNote, MenuCategory } from '@/src/types';
import { ScoreBar } from './ScoreBar';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-[13px] text-gray-400 w-[60px]">{label}</Text>
      <Text className="text-[13px] text-[#333] flex-1">{value}</Text>
    </View>
  );
}

export function NoteView({ note, category }: { note: CafeTastingNote; category: MenuCategory }) {
  return (
    <View className="gap-1.5">
      <View className="mt-2 gap-1.5">
        {note.origin && <InfoRow label="원산지" value={note.origin} />}
        {category === 'handdip' && note.variety && <InfoRow label="품종" value={note.variety} />}
        {category === 'handdip' && note.process && <InfoRow label="가공법" value={note.process} />}
        {note.roast_level && <InfoRow label="로스팅" value={note.roast_level} />}
        {note.temperature && <InfoRow label="온도" value={note.temperature} />}
        {(note.official_notes?.length ?? 0) > 0 && (
          <InfoRow label="공식 노트" value={note.official_notes!.join(', ')} />
        )}
        {(note.my_notes?.length ?? 0) > 0 && (
          <InfoRow label="내 노트" value={note.my_notes!.join(', ')} />
        )}
      </View>
      {category !== 'simple' && (
        <View className="gap-2 mt-2">
          {note.acidity != null && <ScoreBar label="산미" value={note.acidity} />}
          {note.nuttiness != null && <ScoreBar label="고소함" value={note.nuttiness} />}
          {note.richness != null && <ScoreBar label="진함" value={note.richness} />}
          {note.smoothness != null && <ScoreBar label="부드러움" value={note.smoothness} />}
        </View>
      )}
    </View>
  );
}
