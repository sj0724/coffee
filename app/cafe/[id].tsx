import { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  ActionSheetIOS,
  Platform,
  useWindowDimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCafeLog, deleteCafeLog, setFavorite } from '@/src/db/queries/cafeLogs';
import { getMenuItems, deleteMenuItem } from '@/src/db/queries/cafeMenuItems';
import { getTastingNote } from '@/src/db/queries/tastingNotes';
import { getEspressoNote } from '@/src/db/queries/espressoNotes';
import { CafeLog, CafeMenuItem, HanddripNote, EspressoNote } from '@/src/types';
import { NoteView } from '@/src/components/cafe/NoteView';
import { EspressoNoteView } from '@/src/components/cafe/EspressoNoteView';
import { FlipCard } from '@/src/components/cafe/FlipCard';
import { getMenuCategory } from '@/src/components/cafe/menuCategory';

function MenuActionDropdown({ onEdit, onDelete }: { onEdit?: () => void; onDelete: () => void }) {
  const anchorRef = useRef<View>(null);
  const { height: screenHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [anchorBottom, setAnchorBottom] = useState(0);

  function show() {
    anchorRef.current?.measureInWindow((_x, y, _width, height) => {
      setAnchorBottom(y + height);
      setOpen(true);
    });
  }

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <View ref={anchorRef} collapsable={false}>
      <TouchableOpacity onPress={show} style={{ padding: 6, margin: -6 }}>
        <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1 }} onPress={() => setOpen(false)}>
          <View
            style={{
              position: 'absolute',
              top: Math.max(12, Math.min(anchorBottom + 4, screenHeight - (onEdit ? 126 : 78))),
              right: 20,
              minWidth: 132,
              paddingVertical: 6,
              borderRadius: 12,
              backgroundColor: '#fff',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.14,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            {onEdit && (
              <TouchableOpacity
                onPress={() => run(onEdit)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}
              >
                <Ionicons name="pencil-outline" size={18} color="#333" />
                <Text style={{ fontSize: 14, color: '#333', fontWeight: '600' }}>수정</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => run(onDelete)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}
            >
              <Ionicons name="trash-outline" size={18} color="#D9534F" />
              <Text style={{ fontSize: 14, color: '#D9534F', fontWeight: '600' }}>삭제</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export default function CafeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [log, setLog] = useState<CafeLog | null>(null);
  const [menuItems, setMenuItems] = useState<CafeMenuItem[]>([]);
  const [handripNotesMap, setHandripNotesMap] = useState<Record<number, HanddripNote>>({});
  const [espressoNotesMap, setEspressoNotesMap] = useState<Record<number, EspressoNote>>({});

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [id]),
  );

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
        } else if (item.is_coffee == null) {
          // 사용자 지정 메뉴명의 기존 핸드드립 기록도 저장된 노트로 판별한다.
          const note = await getTastingNote(item.id!);
          if (note) handripMap[item.id!] = note;
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
            <FlipCard
              frontUri={notePhotoUris[0]}
              backUri={notePhotoUris[1] ?? null}
              width={photoW * 0.72}
            />
          </View>
        )}

        {cafePhotoUris.length > 0 && (
          <View style={{ marginTop: notePhotoUris.length > 0 ? 4 : 20, gap: 8 }}>
            <Text
              style={{ fontSize: 14, fontWeight: '600', color: '#5F5A54', paddingHorizontal: 20 }}
            >
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

        <View
          style={{
            marginHorizontal: 20,
            marginTop: 4,
            padding: 20,
            borderRadius: 20,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: '#ECEAE6',
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#1D1D1B', letterSpacing: -0.5 }}>
            {log.cafe_name}
          </Text>
          <View style={{ gap: 10, marginTop: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F4F2EE',
                }}
              >
                <Ionicons name="calendar-outline" size={15} color="#69645D" />
              </View>
              <Text style={{ fontSize: 14, color: '#68645E' }}>{log.visited_at}</Text>
            </View>
            {log.address ? (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                onPress={() => {
                  const query = encodeURIComponent(`${log.cafe_name} ${log.address}`);
                  Linking.openURL(`https://map.naver.com/v5/search/${query}`);
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#F4F2EE',
                  }}
                >
                  <Ionicons name="location-outline" size={16} color="#69645D" />
                </View>
                <Text style={{ flex: 1, fontSize: 14, color: '#3F3C38' }} numberOfLines={2}>
                  {log.address}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#B5B0A8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {log.memo ? (
            <View
              style={{
                marginTop: 18,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: '#EFEDE9',
                flexDirection: 'row',
                gap: 10,
              }}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={17} color="#918A80" />
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 21, color: '#55514C' }}>
                {log.memo}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 8 }}>
          <View className="flex-row items-center px-5 mb-3">
            <Text className="text-[18px] font-bold text-[#222]">메뉴</Text>
          </View>

          {menuItems.length === 0 && (
            <View className="px-5 py-8 mx-5 bg-white border border-coffee-border rounded-2xl">
              <Text className="text-sm text-center text-gray-300">등록된 메뉴가 없어요.</Text>
            </View>
          )}

          {menuItems.length > 0 && (
            <View style={{ gap: 12, paddingHorizontal: 20 }}>
              {menuItems.map((item) => {
                const category = handripNotesMap[item.id!]
                  ? 'handdip'
                  : getMenuCategory(item.menu_name, item.is_coffee);

                return (
                  <View
                    key={item.id}
                    style={{
                      padding: 18,
                      borderRadius: 18,
                      backgroundColor: '#fff',
                      borderWidth: 1,
                      borderColor: '#ECEAE6',
                    }}
                  >
                    <View className="flex-row items-center justify-between mb-3">
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text className="text-[17px] font-bold text-[#222]">{item.menu_name}</Text>
                      </View>
                      <MenuActionDropdown
                        onEdit={
                          category !== 'simple'
                            ? () => router.push(`/cafe/menu/${item.id}/edit`)
                            : undefined
                        }
                        onDelete={() => handleDeleteMenu(item.id!)}
                      />
                    </View>

                    {category === 'handdip' &&
                      (handripNotesMap[item.id!] ? (
                        <NoteView note={handripNotesMap[item.id!]} />
                      ) : (
                        <Text className="py-1 text-xs text-gray-300">노트를 추가해보세요.</Text>
                      ))}

                    {category === 'espresso' &&
                      (espressoNotesMap[item.id!] ? (
                        <EspressoNoteView note={espressoNotesMap[item.id!]} />
                      ) : (
                        <Text className="py-1 text-xs text-gray-300">특징을 추가해보세요.</Text>
                      ))}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
