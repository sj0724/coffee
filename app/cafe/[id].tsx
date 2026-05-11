import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCafeLog, deleteCafeLog } from '@/src/db/queries/cafeLogs';
import { getMenuItems, createMenuItem, deleteMenuItem } from '@/src/db/queries/cafeMenuItems';
import { getTastingNote, upsertTastingNote } from '@/src/db/queries/tastingNotes';
import { CafeLog, CafeMenuItem, CafeTastingNote } from '@/src/types';

const FLAVOR_OPTIONS = [
  { label: '과일', tags: ['베리', '블루베리', '딸기', '체리', '오렌지', '자몽', '사과', '복숭아'] },
  { label: '꽃향', tags: ['자스민', '플로럴', '라벤더', '로즈'] },
  { label: '단맛', tags: ['카라멜', '흑설탕', '꿀', '메이플시럽'] },
  { label: '초콜릿/견과', tags: ['다크초콜릿', '밀크초콜릿', '코코아', '아몬드', '헤이즐넛'] },
  { label: '기타', tags: ['와인', '홍차', '스파이스', '허브'] },
];
const MAX_MY_NOTES = 5;

const COFFEE_OPTIONS = [
  '에스프레소',
  '아메리카노',
  '라떼',
  '카푸치노',
  '플랫화이트',
  '핸드드립',
  '콜드브루',
];

type MenuCategory = 'handdip' | 'espresso' | 'simple';

function getMenuCategory(menuName: string): MenuCategory {
  if (menuName === '핸드드립') return 'handdip';
  if (COFFEE_OPTIONS.includes(menuName)) return 'espresso';
  return 'simple';
}

export default function CafeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [log, setLog] = useState<CafeLog | null>(null);
  const [photoSize, setPhotoSize] = useState<{ width: number; height: number } | null>(null);
  const [menuItems, setMenuItems] = useState<CafeMenuItem[]>([]);
  const [notesMap, setNotesMap] = useState<Record<number, CafeTastingNote>>({});
  const [addingMenu, setAddingMenu] = useState(false);
  const [customMenuInput, setCustomMenuInput] = useState('');
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [noteForm, setNoteForm] = useState<Partial<CafeTastingNote>>({});

  useEffect(() => {
    loadAll();
  }, [id]);

  async function loadAll() {
    const logId = Number(id);
    const [l, items] = await Promise.all([getCafeLog(logId), getMenuItems(logId)]);
    setLog(l);
    setMenuItems(items);
    if (l?.photo_uri) {
      RNImage.getSize(
        l.photo_uri,
        (w, h) => setPhotoSize({ width: w, height: h }),
        () => {},
      );
    }
    const pairs = await Promise.all(
      items.map(async (item) => {
        const note = await getTastingNote(item.id!);
        return [item.id!, note] as [number, CafeTastingNote | null];
      }),
    );
    const map: Record<number, CafeTastingNote> = {};
    for (const [itemId, note] of pairs) {
      if (note) map[itemId] = note;
    }
    setNotesMap(map);
  }

  async function handleDeleteLog() {
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

  async function handleAddMenu(menuName: string) {
    const newId = await createMenuItem({ cafe_log_id: Number(id), menu_name: menuName });
    setAddingMenu(false);
    if (newId) {
      await loadAll();
      setEditingMenuId(newId);
      setNoteForm({});
    }
  }

  async function handleDeleteMenu(menuId: number) {
    Alert.alert('메뉴 삭제', '이 메뉴를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteMenuItem(menuId);
          loadAll();
        },
      },
    ]);
  }

  async function handleSaveNote(menuId: number) {
    await upsertTastingNote({ ...noteForm, cafe_menu_item_id: menuId } as CafeTastingNote);
    setEditingMenuId(null);
    loadAll();
  }

  function startEditing(item: CafeMenuItem) {
    const existing = notesMap[item.id!];
    setNoteForm(
      existing
        ? {
            origin: existing.origin,
            variety: existing.variety,
            process: existing.process,
            roast_level: existing.roast_level,
            official_notes: existing.official_notes,
            my_notes: existing.my_notes,
            temperature: existing.temperature,
            acidity: existing.acidity,
            nuttiness: existing.nuttiness,
            richness: existing.richness,
            smoothness: existing.smoothness,
          }
        : {},
    );
    setEditingMenuId(item.id!);
  }

  if (!log) return <View className="flex-1 bg-coffee-light" />;

  const imgW = photoSize?.width ?? 200;
  const imgH = photoSize?.height ?? 300;

  return (
    <ScrollView
      className="flex-1 bg-coffee-light"
      contentContainerStyle={{ gap: 16, paddingBottom: 40 }}
    >
      {log.photo_uri && (
        <Image
          source={{ uri: log.photo_uri }}
          style={{
            width: imgW,
            height: imgH,
            alignSelf: 'center',
            borderRadius: 12,
            marginTop: 20,
            marginHorizontal: 20,
          }}
          contentFit="cover"
        />
      )}

      <View className="flex-row items-start gap-3 px-5 pt-5">
        <View className="flex-1">
          <Text className="text-[22px] font-bold text-[#222]">{log.cafe_name}</Text>
          <Text className="text-[13px] text-gray-400 mt-1">{log.visited_at}</Text>
        </View>
        <TouchableOpacity onPress={handleDeleteLog}>
          <Ionicons name="trash-outline" size={22} color="#E76F51" />
        </TouchableOpacity>
      </View>

      {log.memo ? (
        <View className="p-4 mx-5 bg-white shadow-sm rounded-xl">
          <Text className="text-[13px] font-bold text-[#333] mb-1">메모</Text>
          <Text className="text-sm text-[#555] leading-5">{log.memo}</Text>
        </View>
      ) : null}

      <View className="mx-5">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-[16px] font-bold text-[#222]">메뉴</Text>
          <TouchableOpacity
            className="flex-row items-center gap-1"
            onPress={() => {
              setAddingMenu(!addingMenu);
              setEditingMenuId(null);
            }}
          >
            <Ionicons
              name={addingMenu ? 'close-outline' : 'add-circle-outline'}
              size={22}
              color="#6F4E37"
            />
            {!addingMenu && <Text className="text-sm font-semibold text-coffee">추가</Text>}
          </TouchableOpacity>
        </View>

        {addingMenu && (
          <View className="gap-3 p-4 mb-3 bg-white shadow-sm rounded-xl">
            <View>
              <Text className="text-[13px] font-semibold text-[#444] mb-2">커피</Text>
              <View className="flex-row flex-wrap gap-2">
                {COFFEE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => handleAddMenu(option)}
                    className="px-3 py-1.5 rounded-full border border-coffee-border bg-white"
                  >
                    <Text className="text-sm text-[#555]">{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View>
              <Text className="text-[13px] font-semibold text-[#444] mb-2">논커피 / 기타</Text>
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 border border-coffee-border rounded-lg px-3 py-2 text-sm text-[#222] bg-white"
                  value={customMenuInput}
                  onChangeText={setCustomMenuInput}
                  placeholder="말차 라떼, 자몽 에이드..."
                  placeholderTextColor="#ccc"
                />
                <TouchableOpacity
                  className="items-center justify-center px-4 rounded-lg bg-coffee"
                  onPress={() => {
                    if (customMenuInput.trim()) {
                      handleAddMenu(customMenuInput.trim());
                      setCustomMenuInput('');
                    }
                  }}
                >
                  <Text className="text-sm font-semibold text-white">추가</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {menuItems.length === 0 && !addingMenu && (
          <Text className="py-4 text-sm text-center text-gray-300">메뉴를 추가해보세요.</Text>
        )}

        {menuItems.map((item) => {
          const note = notesMap[item.id!];
          const category = getMenuCategory(item.menu_name);
          const isEditing = editingMenuId === item.id;

          return (
            <View key={item.id} className="p-4 mb-3 bg-white shadow-sm rounded-xl">
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <View className="px-3 py-1 rounded-full bg-coffee-cream">
                    <Text className="text-[13px] font-bold text-coffee">{item.menu_name}</Text>
                  </View>
                </View>
                <View className="flex-row gap-3">
                  {category !== 'simple' && (
                    <TouchableOpacity
                      onPress={() => (isEditing ? setEditingMenuId(null) : startEditing(item))}
                    >
                      <Ionicons
                        name={isEditing ? 'close-outline' : 'pencil-outline'}
                        size={18}
                        color="#6F4E37"
                      />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleDeleteMenu(item.id!)}>
                    <Ionicons name="trash-outline" size={18} color="#E76F51" />
                  </TouchableOpacity>
                </View>
              </View>

              {category !== 'simple' &&
                (isEditing ? (
                  <NoteForm
                    category={category}
                    form={noteForm}
                    onChange={setNoteForm}
                    onSave={() => handleSaveNote(item.id!)}
                  />
                ) : note ? (
                  <NoteView note={note} category={category} />
                ) : (
                  <Text className="py-1 text-xs text-gray-300">노트를 추가해보세요.</Text>
                ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function NoteForm({
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

function NoteView({ note, category }: { note: CafeTastingNote; category: MenuCategory }) {
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

function TagsInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string[];
  onChange: (tags: string[]) => void;
}) {
  const [raw, setRaw] = useState(value?.join(', ') ?? '');

  return (
    <View>
      <Text className="text-[13px] text-[#666] mb-1">{label}</Text>
      <TextInput
        className="border border-coffee-border rounded-lg p-2.5 text-sm text-[#222] bg-white"
        value={raw}
        onChangeText={setRaw}
        onBlur={() =>
          onChange(
            raw
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
        placeholderTextColor="#ccc"
        placeholder="자스민, 복숭아, 꿀..."
      />
    </View>
  );
}

function MyNotesInput({
  value,
  onChange,
}: {
  value?: string[];
  onChange: (tags: string[]) => void;
}) {
  const selected = value ?? [];

  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else if (selected.length < MAX_MY_NOTES) {
      onChange([...selected, tag]);
    }
  }

  return (
    <View className="gap-3 mb-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] text-[#666]">내 노트</Text>
        <Text className="text-[12px] text-gray-400">
          {selected.length}/{MAX_MY_NOTES}
        </Text>
      </View>
      {FLAVOR_OPTIONS.map((group) => (
        <View key={group.label}>
          <Text className="text-[11px] text-gray-400 mb-1.5">{group.label}</Text>
          <View className="flex-row flex-wrap gap-1.5">
            {group.tags.map((tag) => {
              const isSelected = selected.includes(tag);
              const isDisabled = !isSelected && selected.length >= MAX_MY_NOTES;
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggle(tag)}
                  disabled={isDisabled}
                  className={`px-3 py-1.5 rounded-full border ${
                    isSelected
                      ? 'bg-coffee border-coffee'
                      : isDisabled
                        ? 'border-gray-100 bg-gray-50'
                        : 'border-coffee-border bg-white'
                  }`}
                >
                  <Text
                    className={`text-[12px] ${
                      isSelected ? 'text-white' : isDisabled ? 'text-gray-300' : 'text-[#555]'
                    }`}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
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
  const COFFEE = '#6F4E37';
  const EMPTY = '#E5E7EB';
  const current = value ?? 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ fontSize: 12, color: '#9CA3AF', width: 52 }}>{label}</Text>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].flatMap((n) => {
          const items = [];
          if (n > 1) {
            items.push(
              <View
                key={`line-${n}`}
                style={{ flex: 1, height: 2, backgroundColor: n <= current ? COFFEE : EMPTY }}
              />,
            );
          }
          items.push(
            <TouchableOpacity
              key={`dot-${n}`}
              onPress={() => onChange(n)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: n <= current ? COFFEE : EMPTY,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: n <= current ? '#fff' : '#9CA3AF',
                  fontWeight: '600',
                }}
              >
                {n}
              </Text>
            </TouchableOpacity>,
          );
          return items;
        })}
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

function ScoreBar({ label, value }: { label: string; value: number }) {
  const COFFEE = '#6F4E37';
  const EMPTY = '#E5E7EB';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ fontSize: 12, color: '#9CA3AF', width: 52 }}>{label}</Text>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].flatMap((n) => {
          const items = [];
          if (n > 1) {
            items.push(
              <View
                key={`line-${n}`}
                style={{ flex: 1, height: 2, backgroundColor: n <= value ? COFFEE : EMPTY }}
              />,
            );
          }
          items.push(
            <View
              key={`dot-${n}`}
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: n <= value ? COFFEE : EMPTY,
              }}
            />,
          );
          return items;
        })}
      </View>
      <Text
        style={{ fontSize: 12, color: COFFEE, fontWeight: '600', width: 20, textAlign: 'right' }}
      >
        {value}
      </Text>
    </View>
  );
}
