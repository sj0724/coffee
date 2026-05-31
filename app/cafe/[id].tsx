import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
  TextInput,
  useWindowDimensions,
  Linking,
  Animated,
} from 'react-native';
import DEFAULT_CARD from '@/assets/default-card.jpg';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCafeLog, deleteCafeLog, setFavorite } from '@/src/db/queries/cafeLogs';
import { getMenuItems, createMenuItem, deleteMenuItem } from '@/src/db/queries/cafeMenuItems';
import { getTastingNote, upsertTastingNote } from '@/src/db/queries/tastingNotes';
import { getEspressoNote, upsertEspressoNote } from '@/src/db/queries/espressoNotes';
import { CafeLog, CafeMenuItem, HanddripNote, EspressoNote, MenuCategory } from '@/src/types';
import { NoteForm } from '@/src/components/cafe/NoteForm';
import { NoteView } from '@/src/components/cafe/NoteView';
import { EspressoNoteForm } from '@/src/components/cafe/EspressoNoteForm';
import { EspressoNoteView } from '@/src/components/cafe/EspressoNoteView';

const COFFEE_OPTIONS = [
  '에스프레소',
  '아메리카노',
  '라떼',
  '카푸치노',
  '플랫화이트',
  '핸드드립',
  '콜드브루',
];

function getMenuCategory(menuName: string, isCoffee?: number | null): MenuCategory {
  if (menuName === '핸드드립') return 'handdip';
  if (isCoffee === 1) return 'espresso';
  if (isCoffee === 0) return 'simple';
  // is_coffee 없는 구버전 데이터는 COFFEE_OPTIONS로 폴백
  if (COFFEE_OPTIONS.includes(menuName)) return 'espresso';
  return 'simple';
}

export default function CafeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [log, setLog] = useState<CafeLog | null>(null);
  const [menuItems, setMenuItems] = useState<CafeMenuItem[]>([]);
  const [handripNotesMap, setHandripNotesMap] = useState<Record<number, HanddripNote>>({});
  const [espressoNotesMap, setEspressoNotesMap] = useState<Record<number, EspressoNote>>({});
  const [addingMenu, setAddingMenu] = useState(false);
  const [customMenuInput, setCustomMenuInput] = useState('');
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null);
  const [handripForm, setHandripForm] = useState<Partial<HanddripNote>>({});
  const [espressoTags, setEspressoTags] = useState<string[]>([]);

  useEffect(() => {
    loadAll();
  }, [id]);

  async function loadAll() {
    const logId = Number(id);
    const [l, items] = await Promise.all([getCafeLog(logId), getMenuItems(logId)]);
    setLog(l);
    setMenuItems(items);

    const handripMap: Record<number, HanddripNote> = {};
    const espressoMap: Record<number, EspressoNote> = {};

    await Promise.all(
      items.map(async (item) => {
        const category = getMenuCategory(item.menu_name, item.is_coffee);
        if (category === 'handdip') {
          const note = await getTastingNote(item.id!);
          if (note) handripMap[item.id!] = note;
        } else if (category === 'espresso') {
          const note = await getEspressoNote(item.id!);
          if (note) espressoMap[item.id!] = note;
        }
      }),
    );

    setHandripNotesMap(handripMap);
    setEspressoNotesMap(espressoMap);
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

  function showMoreOptions() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['취소', '삭제'], cancelButtonIndex: 0, destructiveButtonIndex: 1 },
        (index) => {
          if (index === 1) handleDeleteLog();
        },
      );
    } else {
      handleDeleteLog();
    }
  }

  async function handleAddMenu(menuName: string) {
    const newId = await createMenuItem({ cafe_log_id: Number(id), menu_name: menuName });
    setAddingMenu(false);
    if (newId) {
      await loadAll();
      setEditingMenuId(newId);
      setHandripForm({});
      setEspressoTags([]);
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

  async function handleSaveNote(menuId: number, category: MenuCategory) {
    if (category === 'handdip') {
      await upsertTastingNote({ ...handripForm, cafe_menu_item_id: menuId } as HanddripNote);
    } else if (category === 'espresso') {
      await upsertEspressoNote({ cafe_menu_item_id: menuId, tags: espressoTags });
    }
    setEditingMenuId(null);
    loadAll();
  }

  function startEditing(item: CafeMenuItem) {
    const category = getMenuCategory(item.menu_name, item.is_coffee);
    setEditingMenuId(item.id!);
    if (category === 'handdip') {
      const existing = handripNotesMap[item.id!];
      setHandripForm(existing ? { ...existing } : {});
    } else if (category === 'espresso') {
      const existing = espressoNotesMap[item.id!];
      setEspressoTags(existing ? [...existing.tags] : []);
    }
  }

  if (!log) return <View className="flex-1 bg-coffee-light" />;

  const isFav = !!log.is_favorite;

  const cafePhotoUris: string[] = (() => {
    try {
      return log.photos ? JSON.parse(log.photos) : [];
    } catch {
      return [];
    }
  })();
  const notePhotoUris: string[] = (() => {
    try {
      return log.note_photos ? JSON.parse(log.note_photos) : [];
    } catch {
      return [];
    }
  })();
  const photoW = screenWidth - 40;
  const photoH = Math.round(photoW * 1.25);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity onPress={handleToggleFavorite} style={{ padding: 6 }}>
                <Ionicons
                  name={isFav ? 'star' : 'star-outline'}
                  size={22}
                  color={isFav ? '#F5A623' : '#888'}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={showMoreOptions} style={{ padding: 6 }}>
                <Ionicons name="ellipsis-horizontal" size={22} color="#111" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-coffee-light"
        contentContainerStyle={{ gap: 16, paddingBottom: 40 }}
      >
        {notePhotoUris.length > 0 && (
          <View style={{ marginTop: 20, gap: 8, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: '#999',
                alignSelf: 'flex-start',
                paddingHorizontal: 20,
              }}
            >
              노트 사진
            </Text>
            <FlipCard
              frontUri={notePhotoUris[0]}
              backUri={notePhotoUris[1] ?? null}
              width={photoW * 0.72}
            />
          </View>
        )}

        {cafePhotoUris.length > 0 && (
          <View style={{ marginTop: notePhotoUris.length > 0 ? 4 : 20, gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#999', paddingHorizontal: 20 }}>
              카페 · 메뉴 사진
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
            >
              {cafePhotoUris.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={{ width: photoW, height: photoH, borderRadius: 12 }}
                  contentFit="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View className="px-5 pt-5">
          <Text className="text-[22px] font-bold text-[#222]">{log.cafe_name}</Text>
          <Text className="text-[13px] text-gray-400 mt-1">{log.visited_at}</Text>
          {log.address ? (
            <TouchableOpacity
              className="flex-row items-center gap-1 mt-2"
              onPress={() => {
                const query = encodeURIComponent(`${log.cafe_name} ${log.address}`);
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
            const category = getMenuCategory(item.menu_name, item.is_coffee);
            const isEditing = editingMenuId === item.id;

            return (
              <View key={item.id} className="p-4 mb-3 bg-white shadow-sm rounded-xl">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="px-3 py-1 rounded-full bg-coffee-cream">
                    <Text className="text-[13px] font-bold text-coffee">{item.menu_name}</Text>
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

                {category === 'handdip' &&
                  (isEditing ? (
                    <NoteForm
                      form={handripForm}
                      onChange={setHandripForm}
                      onSave={() => handleSaveNote(item.id!, category)}
                    />
                  ) : handripNotesMap[item.id!] ? (
                    <NoteView note={handripNotesMap[item.id!]} />
                  ) : (
                    <Text className="py-1 text-xs text-gray-300">노트를 추가해보세요.</Text>
                  ))}

                {category === 'espresso' &&
                  (isEditing ? (
                    <EspressoNoteForm
                      tags={espressoTags}
                      onChange={setEspressoTags}
                      onSave={() => handleSaveNote(item.id!, category)}
                    />
                  ) : espressoNotesMap[item.id!] ? (
                    <EspressoNoteView note={espressoNotesMap[item.id!]} />
                  ) : (
                    <Text className="py-1 text-xs text-gray-300">특징을 추가해보세요.</Text>
                  ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </>
  );
}

function FlipCard({
  frontUri,
  backUri,
  width,
}: {
  frontUri: string;
  backUri: string | null;
  width: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const [frontH, setFrontH] = useState(width * 1.4);
  const anim = useRef(new Animated.Value(0)).current;

  function flip() {
    Animated.spring(anim, {
      toValue: flipped ? 0 : 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
    setFlipped((f) => !f);
  }

  const frontRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <TouchableOpacity onPress={flip} activeOpacity={0.95} style={{ width, height: frontH }}>
      {/* 앞면 */}
      <Animated.View
        style={{
          position: 'absolute',
          width,
          height: frontH,
          backfaceVisibility: 'hidden',
          transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
        }}
      >
        <Image
          source={{ uri: frontUri }}
          style={{ width, height: frontH, borderRadius: 14 }}
          contentFit="cover"
          onLoad={(e) => {
            const { width: w, height: h } = e.source;
            if (w && h) setFrontH(width * (h / w));
          }}
        />
      </Animated.View>

      {/* 뒷면 - 앞면과 동일한 사이즈 사용 */}
      <Animated.View
        style={{
          position: 'absolute',
          width,
          height: frontH,
          backfaceVisibility: 'hidden',
          transform: [{ perspective: 1200 }, { rotateY: backRotate }],
        }}
      >
        <Image
          source={backUri ? { uri: backUri } : DEFAULT_CARD}
          style={{ width, height: frontH, borderRadius: 14 }}
          contentFit="cover"
        />
      </Animated.View>
    </TouchableOpacity>
  );
}
