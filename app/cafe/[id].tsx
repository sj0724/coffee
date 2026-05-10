import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, TextInput, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCafeLog, deleteCafeLog } from '@/src/db/queries/cafeLogs';
import { getTastingNote, upsertTastingNote } from '@/src/db/queries/tastingNotes';
import { CafeLog, CafeTastingNote } from '@/src/types';

export default function CafeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [log, setLog] = useState<CafeLog | null>(null);
  const [note, setNote] = useState<CafeTastingNote | null>(null);
  const [photoSize, setPhotoSize] = useState<{ width: number; height: number } | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteForm, setNoteForm] = useState<Partial<CafeTastingNote>>({});

  useEffect(() => {
    loadData();
  }, [id]);

  async function loadData() {
    const logId = Number(id);
    const [l, n] = await Promise.all([getCafeLog(logId), getTastingNote(logId)]);
    setLog(l);
    setNote(n);
    if (l?.photo_uri) {
      RNImage.getSize(l.photo_uri, (w, h) => setPhotoSize({ width: w, height: h }), () => {});
    }
    if (n) {
      setNoteForm({
        origin: n.origin,
        variety: n.variety,
        process: n.process,
        roast_level: n.roast_level,
        official_notes: n.official_notes,
        my_notes: n.my_notes,
        acidity: n.acidity,
        sweetness: n.sweetness,
        bitterness: n.bitterness,
        body: n.body,
      });
    }
  }

  async function handleDelete() {
    Alert.alert('삭제', '이 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteCafeLog(Number(id));
          router.back();
        },
      },
    ]);
  }

  async function handleSaveNote() {
    const ok = await upsertTastingNote({
      ...noteForm,
      cafe_log_id: Number(id),
      official_notes: noteForm.official_notes ?? [],
      my_notes: noteForm.my_notes ?? [],
    } as CafeTastingNote);
    if (ok) {
      setEditingNote(false);
      loadData();
    }
  }

  if (!log) return <View className="flex-1 bg-coffee-light" />;

  const imgW = photoSize?.width ?? 200;
  const imgH = photoSize?.height ?? 300;

  return (
    <ScrollView
      className="flex-1 bg-coffee-light"
      contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
    >
      {log.photo_uri && (
        <Image
          source={{ uri: log.photo_uri }}
          style={{ width: imgW, height: imgH, alignSelf: 'center', borderRadius: 12 }}
          contentFit="cover"
        />
      )}

      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <Text className="text-[22px] font-bold text-[#222]">{log.cafe_name}</Text>
          <Text className="text-base text-coffee mt-1">{log.menu_name}</Text>
          <Text className="text-[13px] text-gray-400 mt-1">{log.visited_at}</Text>
          {log.rating != null && (
            <Text className="text-lg text-accent mt-1.5">
              {'★'.repeat(log.rating)}
              {'☆'.repeat(5 - log.rating)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#E76F51" />
        </TouchableOpacity>
      </View>

      {log.memo ? (
        <View className="bg-white rounded-xl p-4 gap-3 shadow-sm">
          <Text className="text-[15px] font-bold text-[#333]">메모</Text>
          <Text className="text-sm text-[#555] leading-5">{log.memo}</Text>
        </View>
      ) : null}

      <View className="bg-white rounded-xl p-4 gap-3 shadow-sm">
        <View className="flex-row justify-between items-center">
          <Text className="text-[15px] font-bold text-[#333]">테이스팅 노트</Text>
          <TouchableOpacity onPress={() => setEditingNote(!editingNote)}>
            <Ionicons
              name={editingNote ? 'close-outline' : 'pencil-outline'}
              size={20}
              color="#6F4E37"
            />
          </TouchableOpacity>
        </View>

        {editingNote ? (
          <View className="gap-3">
            <NoteInput
              label="원산지"
              value={noteForm.origin}
              onChange={(v) => setNoteForm((f) => ({ ...f, origin: v }))}
            />
            <NoteInput
              label="품종"
              value={noteForm.variety}
              onChange={(v) => setNoteForm((f) => ({ ...f, variety: v }))}
            />
            <NoteInput
              label="가공법"
              value={noteForm.process}
              onChange={(v) => setNoteForm((f) => ({ ...f, process: v }))}
            />
            <NoteInput
              label="로스팅"
              value={noteForm.roast_level}
              onChange={(v) => setNoteForm((f) => ({ ...f, roast_level: v }))}
            />
            <NoteInput
              label="공식 노트 (쉼표 구분)"
              value={noteForm.official_notes?.join(', ')}
              onChange={(v) =>
                setNoteForm((f) => ({
                  ...f,
                  official_notes: v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
            />
            <NoteInput
              label="내 노트 (쉼표 구분)"
              value={noteForm.my_notes?.join(', ')}
              onChange={(v) =>
                setNoteForm((f) => ({
                  ...f,
                  my_notes: v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
            />
            <SliderRow
              label="산미"
              value={noteForm.acidity}
              onChange={(v) => setNoteForm((f) => ({ ...f, acidity: v }))}
            />
            <SliderRow
              label="단맛"
              value={noteForm.sweetness}
              onChange={(v) => setNoteForm((f) => ({ ...f, sweetness: v }))}
            />
            <SliderRow
              label="쓴맛"
              value={noteForm.bitterness}
              onChange={(v) => setNoteForm((f) => ({ ...f, bitterness: v }))}
            />
            <SliderRow
              label="바디"
              value={noteForm.body}
              onChange={(v) => setNoteForm((f) => ({ ...f, body: v }))}
            />
            <TouchableOpacity
              className="bg-coffee rounded-lg p-3 items-center"
              onPress={handleSaveNote}
            >
              <Text className="text-white font-bold">노트 저장</Text>
            </TouchableOpacity>
          </View>
        ) : note ? (
          <View className="gap-2">
            {note.origin && <InfoRow label="원산지" value={note.origin} />}
            {note.variety && <InfoRow label="품종" value={note.variety} />}
            {note.process && <InfoRow label="가공법" value={note.process} />}
            {note.roast_level && <InfoRow label="로스팅" value={note.roast_level} />}
            {(note.official_notes?.length ?? 0) > 0 && (
              <InfoRow label="공식 노트" value={note.official_notes!.join(', ')} />
            )}
            {(note.my_notes?.length ?? 0) > 0 && (
              <InfoRow label="내 노트" value={note.my_notes!.join(', ')} />
            )}
            <View className="flex-row flex-wrap gap-2 mt-1">
              {note.acidity != null && <ScoreChip label="산미" value={note.acidity} />}
              {note.sweetness != null && <ScoreChip label="단맛" value={note.sweetness} />}
              {note.bitterness != null && <ScoreChip label="쓴맛" value={note.bitterness} />}
              {note.body != null && <ScoreChip label="바디" value={note.body} />}
            </View>
          </View>
        ) : (
          <Text className="text-sm text-gray-300 text-center py-2">
            테이스팅 노트를 추가해보세요.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

function NoteInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <View>
      <Text className="text-[13px] text-[#666] mb-1">{label}</Text>
      <TextInput
        className="border border-coffee-border rounded-lg p-2.5 text-sm text-[#222] bg-white"
        value={value ?? ''}
        onChangeText={onChange}
        placeholderTextColor="#ccc"
        placeholder={label}
      />
    </View>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: number) => void;
}) {
  return (
    <View>
      <Text className="text-[13px] text-[#666] mb-1">{label}</Text>
      <View className="flex-row gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            className={`w-9 h-9 rounded-full border items-center justify-center ${
              n <= (value ?? 0) ? 'bg-coffee border-coffee' : 'border-gray-200'
            }`}
            onPress={() => onChange(n)}
          >
            <Text className={`text-sm ${n <= (value ?? 0) ? 'text-white' : 'text-gray-400'}`}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-[13px] text-gray-400 w-[60px]">{label}</Text>
      <Text className="text-[13px] text-[#333] flex-1">{value}</Text>
    </View>
  );
}

function ScoreChip({ label, value }: { label: string; value: number }) {
  return (
    <View className="bg-coffee-cream rounded-full px-3 py-1.5 items-center">
      <Text className="text-[11px] text-coffee">{label}</Text>
      <Text className="text-[13px] font-bold text-coffee">{value}/5</Text>
    </View>
  );
}
