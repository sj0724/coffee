import { View, Text } from 'react-native';
import { HanddripNote, HanddripNoteBean } from '@/src/types';
import { ScoreBar } from './ScoreBar';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-[13px] text-gray-400 w-[60px]">{label}</Text>
      <Text className="text-[13px] text-[#333] flex-1">{value}</Text>
    </View>
  );
}

function BeanRow({ bean, index }: { bean: HanddripNoteBean; index: number }) {
  const parts = [bean.origin, bean.variety, bean.process].filter(Boolean);
  if (!parts.length) return null;
  const label = bean.ratio != null ? `원두 ${index + 1} (${bean.ratio}%)` : `원두 ${index + 1}`;
  return <InfoRow label={label} value={parts.join(' · ')} />;
}

export function NoteView({ note }: { note: HanddripNote }) {
  const isBlend = !!note.is_blend;

  return (
    <View className="gap-1.5">
      <View className="mt-2 gap-1.5">
        {isBlend ? (
          <>
            <View className="flex-row gap-2 mb-0.5">
              <Text className="text-[13px] text-gray-400 w-[60px]">원두</Text>
              <Text className="text-[13px] text-coffee font-semibold">블랜드</Text>
            </View>
            {(note.beans ?? []).map((bean, idx) => (
              <BeanRow key={idx} bean={bean} index={idx} />
            ))}
          </>
        ) : (
          <>
            {note.origin && <InfoRow label="원산지" value={note.origin} />}
            {note.variety && <InfoRow label="품종" value={note.variety} />}
            {note.process && <InfoRow label="가공법" value={note.process} />}
          </>
        )}
        {note.roast_level && <InfoRow label="로스팅" value={note.roast_level} />}
        {(note.official_notes?.length ?? 0) > 0 && (
          <InfoRow label="공식 노트" value={note.official_notes!.join(', ')} />
        )}
        {(note.my_notes?.length ?? 0) > 0 && (
          <InfoRow label="내 노트" value={note.my_notes!.join(', ')} />
        )}
      </View>
      <View className="gap-2 mt-2">
        {note.acidity != null && <ScoreBar label="산미" value={note.acidity} />}
        {note.nuttiness != null && <ScoreBar label="고소함" value={note.nuttiness} />}
        {note.richness != null && <ScoreBar label="진함" value={note.richness} />}
        {note.smoothness != null && <ScoreBar label="부드러움" value={note.smoothness} />}
      </View>
    </View>
  );
}
