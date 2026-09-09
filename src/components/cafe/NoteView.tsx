import { View, Text } from 'react-native';
import { HanddripNote, HanddripNoteBean } from '@/src/types';
import { ScoreBar } from './ScoreBar';
import { NoteDetailRow, FlavorDetailRow } from './NoteDetailRow';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <NoteDetailRow label={label}>
      <Text className="text-[14px] leading-6 text-coffee" lineBreakStrategyIOS="hangul-word">
        {value}
      </Text>
    </NoteDetailRow>
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
  const hasFlavors = !!(note.official_notes?.length || note.my_notes?.length);
  const hasScores = [note.acidity, note.nuttiness, note.richness, note.smoothness].some(
    (value) => value != null,
  );

  return (
    <View className="gap-5">
      {hasBeanInfo && (
        <View className="gap-3">
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
          {note.roast_level && <InfoRow label="로스팅 정도" value={note.roast_level} />}
        </View>
      )}
      {hasFlavors && (
        <View className={`gap-4 ${hasBeanInfo ? 'border-t border-coffee-separator pt-4' : ''}`}>
          {(note.official_notes?.length ?? 0) > 0 && (
            <FlavorDetailRow label="공식 노트" notes={note.official_notes!} />
          )}
          {(note.my_notes?.length ?? 0) > 0 && (
            <FlavorDetailRow label="내 노트" notes={note.my_notes!} />
          )}
        </View>
      )}
      {hasScores && (
        <View
          className={`gap-3 ${hasBeanInfo || hasFlavors ? 'border-t border-coffee-separator pt-4' : ''}`}
        >
          {note.acidity != null && <ScoreBar label="산미" value={note.acidity} />}
          {note.nuttiness != null && <ScoreBar label="고소함" value={note.nuttiness} />}
          {note.richness != null && <ScoreBar label="진함" value={note.richness} />}
          {note.smoothness != null && <ScoreBar label="부드러움" value={note.smoothness} />}
        </View>
      )}
    </View>
  );
}
