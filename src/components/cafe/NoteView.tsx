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

function NoteTagRow({
  label,
  tags,
  color,
}: {
  label: string;
  tags: string[];
  color: 'blue' | 'coffee';
}) {
  const badgeStyle =
    color === 'blue' ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200';
  const textStyle = color === 'blue' ? 'text-blue-700' : 'text-amber-800';
  return (
    <View className="flex-row gap-2">
      <Text className="text-[13px] text-gray-400 w-[60px] mt-0.5">{label}</Text>
      <View className="flex-row flex-wrap flex-1 gap-1">
        {tags.map((tag, i) => (
          <View key={i} className={`px-2 py-0.5 rounded-full ${badgeStyle}`}>
            <Text className={`text-[12px] ${textStyle}`}>{tag}</Text>
          </View>
        ))}
      </View>
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
      <View className="gap-3 mt-2">
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
          <NoteTagRow label="공식 노트" tags={note.official_notes!} color="blue" />
        )}
        {(note.my_notes?.length ?? 0) > 0 && (
          <NoteTagRow label="내 노트" tags={note.my_notes!} color="coffee" />
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
