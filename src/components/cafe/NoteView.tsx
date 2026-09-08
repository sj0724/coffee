import { View, Text } from 'react-native';
import { HanddripNote, HanddripNoteBean } from '@/src/types';
import { ScoreBar } from './ScoreBar';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-[13px] font-semibold text-[#5F636B] w-[60px]">{label}</Text>
      <Text className="text-[14px] leading-5 text-[#101114] flex-1">{value}</Text>
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
    color === 'blue' ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-coffee-border';
  const textStyle = color === 'blue' ? 'text-blue-700' : 'text-coffee-muted';
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-semibold text-[#5F636B]">{label}</Text>
      <View className="flex-row flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <View key={i} className={`px-2.5 py-1 rounded-full ${badgeStyle}`}>
            <Text className={`text-[13px] ${textStyle}`}>{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function BeanRow({ bean, index }: { bean: HanddripNoteBean; index: number }) {
  const parts = [bean.origin, bean.farm, bean.variety, bean.process].filter(Boolean);
  if (!parts.length) return null;
  const label = bean.ratio != null ? `원두 ${index + 1} (${bean.ratio}%)` : `원두 ${index + 1}`;
  return <InfoRow label={label} value={parts.join(' · ')} />;
}

export function NoteView({ note }: { note: HanddripNote }) {
  // 일부 기존 기록은 is_blend 값 없이 구성 원두만 저장되어 있을 수 있다.
  const isBlend = !!note.is_blend || (note.beans?.length ?? 0) > 0;
  const hasBeanInfo =
    !!note.roast_level ||
    !!note.roastery ||
    (isBlend
      ? (note.beans?.length ?? 0) > 0
      : !!(note.origin || note.farm || note.variety || note.process));
  const hasScores = [note.acidity, note.nuttiness, note.richness, note.smoothness].some(
    (value) => value != null,
  );

  return (
    <View style={{ gap: 14 }}>
      {hasBeanInfo && (
        <View className="gap-3 p-4 bg-[#F4F5F7] rounded-xl">
          {isBlend ? (
            <>
              {(note.beans ?? []).map((bean, idx) => (
                <BeanRow key={idx} bean={bean} index={idx} />
              ))}
            </>
          ) : (
            <>
              {note.origin && <InfoRow label="원산지" value={note.origin} />}
              {note.farm && <InfoRow label="농장" value={note.farm} />}
              {note.variety && <InfoRow label="품종" value={note.variety} />}
              {note.process && <InfoRow label="가공법" value={note.process} />}
            </>
          )}
          {note.roastery && <InfoRow label="로스터리" value={note.roastery} />}
          {note.roast_level && <InfoRow label="로스팅" value={note.roast_level} />}
        </View>
      )}
      {((note.official_notes?.length ?? 0) > 0 || (note.my_notes?.length ?? 0) > 0) && (
        <View style={{ gap: 12 }}>
          {(note.official_notes?.length ?? 0) > 0 && (
            <NoteTagRow label="공식 노트" tags={note.official_notes!} color="blue" />
          )}
          {(note.my_notes?.length ?? 0) > 0 && (
            <NoteTagRow label="내 노트" tags={note.my_notes!} color="coffee" />
          )}
        </View>
      )}
      {hasScores && (
        <View className="gap-3 p-4 bg-[#F4F5F7] rounded-xl">
          {note.acidity != null && <ScoreBar label="산미" value={note.acidity} />}
          {note.nuttiness != null && <ScoreBar label="고소함" value={note.nuttiness} />}
          {note.richness != null && <ScoreBar label="진함" value={note.richness} />}
          {note.smoothness != null && <ScoreBar label="부드러움" value={note.smoothness} />}
        </View>
      )}
    </View>
  );
}
