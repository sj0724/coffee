import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCafeLog, deleteCafeLog, setFavorite } from '@/src/db/queries/cafeLogs';
import { getMenuItems, createMenuItem, deleteMenuItem } from '@/src/db/queries/cafeMenuItems';
import { getTastingNote, upsertTastingNote } from '@/src/db/queries/tastingNotes';
import { CafeLog, CafeMenuItem, CafeTastingNote, MenuCategory } from '@/src/types';
import { NoteForm } from '@/src/components/cafe/NoteForm';
import { NoteView } from '@/src/components/cafe/NoteView';

const COFFEE_OPTIONS = [
  '에스프레소',
  '아메리카노',
  '라떼',
  '카푸치노',
  '플랫화이트',
  '핸드드립',
  '콜드브루',
];

function getMenuCategory(menuName: string): MenuCategory {
  if (menuName === '핸드드립') return 'handdip';
  if (COFFEE_OPTIONS.includes(menuName)) return 'espresso';
  return 'simple';
}

export default function CafeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [log, setLog] = useState<CafeLog | null>(null);
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

  async function handleToggleFavorite() {
    if (!log) return;
    const next = log.is_favorite ? 0 : 1;
    await setFavorite(Number(id), next as 0 | 1);
    setLog({ ...log, is_favorite: next });
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

  const photoUris: string[] = log.photos
    ? (() => {
        try {
          return JSON.parse(log.photos);
        } catch {
          return [];
        }
      })()
    : [];
  const photoW = screenWidth - 40;
  const photoH = Math.round(photoW * 1.25);

  return (
    <ScrollView
      className="flex-1 bg-coffee-light"
      contentContainerStyle={{ gap: 16, paddingBottom: 40 }}
    >
      {photoUris.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 20 }}
          contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
        >
          {photoUris.map((uri, i) => (
            <Image
              key={i}
              source={{ uri }}
              style={{ width: photoW, height: photoH, borderRadius: 12 }}
              contentFit="cover"
            />
          ))}
        </ScrollView>
      )}

      <View className="flex-row items-start gap-3 px-5 pt-5">
        <View className="flex-1">
          <Text className="text-[22px] font-bold text-[#222]">{log.cafe_name}</Text>
          <Text className="text-[13px] text-gray-400 mt-1">{log.visited_at}</Text>
          {log.address ? (
            <TouchableOpacity
              className="flex-row items-center gap-1 mt-2"
              onPress={() => {
                const query = encodeURIComponent(log.address!);
                Linking.openURL(`https://map.naver.com/v5/search/${query}`);
              }}
            >
              <Ionicons name="location-outline" size={14} color="#111111" />
              <Text className="text-[13px] text-coffee underline" numberOfLines={1}>
                {log.address}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity onPress={handleToggleFavorite}>
          <Ionicons
            name={log.is_favorite ? 'star' : 'star-outline'}
            size={22}
            color={log.is_favorite ? '#F5A623' : '#bbb'}
          />
        </TouchableOpacity>
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
              color="#111111"
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
                        color="#111111"
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
