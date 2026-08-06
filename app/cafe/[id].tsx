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
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [log, setLog] = useState<CafeLog | null>(null);
  const [menuItems, setMenuItems] = useState<CafeMenuItem[]>([]);
  const [handripNotesMap, setHandripNotesMap] = useState<Record<number, HanddripNote>>({});
  const [espressoNotesMap, setEspressoNotesMap] = useState<Record<number, EspressoNote>>({});
  const [activeCafePhoto, setActiveCafePhoto] = useState(0);
  const [noteCardOpen, setNoteCardOpen] = useState(false);
  const [cafePhotoAspectRatio, setCafePhotoAspectRatio] = useState(1);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [id]),
  );

  async function loadAll() {
    const logId = Number(id);
    const [l, items] = await Promise.all([getCafeLog(logId), getMenuItems(logId)]);

    if (l?.photos) {
      try {
        const photos = JSON.parse(l.photos) as string[];
        if (photos[0]) {
          const image = await Image.loadAsync(photos[0]);
          if (image.width > 0 && image.height > 0) {
            setCafePhotoAspectRatio(image.width / image.height);
          }
        }
      } catch {
        setCafePhotoAspectRatio(1);
      }
    } else {
      setCafePhotoAspectRatio(1);
    }

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

  if (!log) {
    return (
      <View className="flex-1 bg-coffee-light">
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar style="dark" />
      </View>
    );
  }

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
  const headerOnPhoto = cafePhotoUris.length > 0;
  const headerColor = '#1D1D1B';
  const headerButtonBackground = headerOnPhoto ? 'rgba(255,255,255,0.58)' : '#F4F3F1';
  const headerBorderColor = headerOnPhoto ? 'rgba(255,255,255,0.48)' : '#ECEAE6';
  const headerGradientColors = headerOnPhoto
    ? (['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.38)', 'rgba(255,255,255,0)'] as const)
    : (['#fff', '#fff', '#fff'] as const);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F8F8' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={noteCardOpen ? 'light' : 'dark'} />
      <LinearGradient
        colors={headerGradientColors}
        locations={[0, 0.58, 1]}
        style={{
          position: headerOnPhoto ? 'absolute' : 'relative',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          height: insets.top + (headerOnPhoto ? 124 : 56),
          paddingTop: insets.top,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ height: 48, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: headerButtonBackground,
              borderWidth: 1,
              borderColor: headerBorderColor,
            }}
          >
            <Ionicons name="chevron-back" size={24} color={headerColor} />
          </TouchableOpacity>

          <Text
            numberOfLines={1}
            style={{
              position: 'absolute',
              left: 72,
              right: 72,
              textAlign: 'center',
              fontSize: 16,
              fontWeight: '700',
              color: headerColor,
            }}
          >
            {log.cafe_name}
          </Text>
        </View>
      </LinearGradient>
      <ScrollView
        className="flex-1 bg-coffee-light"
        contentContainerStyle={{ gap: 16, paddingBottom: 40 }}
      >
        {notePhotoUris.length > 0 && cafePhotoUris.length === 0 && (
          <View style={{ marginTop: 20, gap: 8, alignItems: 'center' }}>
            <FlipCard
              frontUri={notePhotoUris[0]}
              backUri={notePhotoUris[1] ?? null}
              width={photoW * 0.72}
            />
          </View>
        )}

        {cafePhotoUris.length > 0 && (
          <View
            style={{
              width: screenWidth,
              height: screenWidth / cafePhotoAspectRatio,
              backgroundColor: '#EEECE8',
            }}
          >
            <ScrollView
              horizontal
              pagingEnabled
              bounces={false}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) =>
                setActiveCafePhoto(Math.round(event.nativeEvent.contentOffset.x / screenWidth))
              }
            >
              {cafePhotoUris.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={{ width: screenWidth, height: screenWidth / cafePhotoAspectRatio }}
                  contentFit="cover"
                />
              ))}
            </ScrollView>

            {cafePhotoUris.length > 1 && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 18,
                  alignSelf: 'center',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 8,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: 'rgba(0,0,0,0.2)',
                }}
              >
                {cafePhotoUris.map((_, index) => {
                  const active = index === activeCafePhoto;
                  return (
                    <View
                      key={index}
                      style={{
                        width: active ? 7 : 5,
                        height: active ? 7 : 5,
                        borderRadius: 999,
                        backgroundColor: active ? '#fff' : 'rgba(255,255,255,0.52)',
                      }}
                    />
                  );
                })}
              </View>
            )}

            {notePhotoUris.length > 0 && (
              <TouchableOpacity
                onPress={() => setNoteCardOpen(true)}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="노트 카드 크게 보기"
                style={{
                  position: 'absolute',
                  right: 16,
                  bottom: 16,
                  width: 78,
                  height: 92,
                  padding: 3,
                  borderRadius: 12,
                  backgroundColor: '#fff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Image
                  source={{ uri: notePhotoUris[0] }}
                  style={{ width: '100%', height: '100%', borderRadius: 9 }}
                  contentFit="cover"
                />
                {notePhotoUris.length > 1 && (
                  <View
                    style={{
                      position: 'absolute',
                      right: 7,
                      bottom: 7,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.62)',
                    }}
                  >
                    <Ionicons name="copy-outline" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            )}
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
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <Text
              style={{
                flex: 1,
                fontSize: 24,
                fontWeight: '800',
                color: '#1D1D1B',
                letterSpacing: -0.5,
              }}
            >
              {log.cafe_name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                onPress={handleToggleFavorite}
                accessibilityRole="button"
                accessibilityLabel={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                style={{
                  width: 36,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={isFav ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFav ? '#D96C67' : '#817B73'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={showMoreOptions}
                accessibilityRole="button"
                accessibilityLabel="더보기"
                style={{
                  width: 36,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#817B73" />
              </TouchableOpacity>
            </View>
          </View>
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
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#222' }}>메뉴</Text>
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
                      borderColor: '#E3DFD9',
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }}
                      >
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 11,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: '#F2EFEA',
                          }}
                        >
                          <Ionicons
                            name={category === 'handdip' ? 'water-outline' : 'cafe-outline'}
                            size={18}
                            color="#59534C"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text className="text-[17px] font-bold text-[#222]">
                            {item.menu_name}
                          </Text>
                          <Text style={{ marginTop: 2, fontSize: 12, color: '#777169' }}>
                            {category === 'handdip'
                              ? '핸드드립 노트'
                              : category === 'espresso'
                                ? '커피 노트'
                                : '일반 메뉴'}
                          </Text>
                        </View>
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

                    {category !== 'simple' && (
                      <View
                        style={{
                          height: 1,
                          marginTop: 14,
                          marginBottom: 16,
                          backgroundColor: '#ECE8E2',
                        }}
                      />
                    )}

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

      <Modal
        transparent
        visible={noteCardOpen}
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setNoteCardOpen(false)}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 20,
            backgroundColor: 'rgba(0,0,0,0.72)',
          }}
        >
          <TouchableOpacity
            onPress={() => setNoteCardOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="닫기"
            style={{
              position: 'absolute',
              top: insets.top + 12,
              right: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.14)',
              zIndex: 1,
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {notePhotoUris.length > 0 && (
            <FlipCard
              frontUri={notePhotoUris[0]}
              backUri={notePhotoUris[1] ?? null}
              width={screenWidth - 40}
            />
          )}
          {notePhotoUris.length > 1 && (
            <Text style={{ marginTop: 20, fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>
              카드를 눌러 뒷면 보기
            </Text>
          )}
        </View>
      </Modal>
    </View>
  );
}
