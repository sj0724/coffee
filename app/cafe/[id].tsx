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
import { hydrateCafeLogImageRatios, parseAspectRatios } from '@/src/services/imageAspectRatios';
import { CafeLogShareModal } from '@/src/components/cafe/CafeLogShareModal';

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
      <TouchableOpacity onPress={show} className="-m-1.5 p-1.5">
        <Ionicons name="ellipsis-horizontal" size={20} color="#5F636B" />
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1" onPress={() => setOpen(false)}>
          <View
            className="absolute right-5 min-w-[132px] rounded-xl bg-white py-1.5"
            style={{
              top: Math.max(12, Math.min(anchorBottom + 4, screenHeight - (onEdit ? 126 : 78))),
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
                className="flex-row items-center gap-2.5 p-3"
              >
                <Ionicons name="pencil-outline" size={18} color="#3F4248" />
                <Text className="text-sm font-semibold text-coffee-muted">수정</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => run(onDelete)}
              className="flex-row items-center gap-2.5 p-3"
            >
              <Ionicons name="trash-outline" size={18} color="#D9534F" />
              <Text className="text-sm font-semibold text-[#D9534F]">삭제</Text>
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
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [id]),
  );

  async function loadAll() {
    const logId = Number(id);
    const [l, items] = await Promise.all([getCafeLog(logId), getMenuItems(logId)]);
    const hydratedLog = l ? await hydrateCafeLogImageRatios(l) : null;

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
    setMenuItems(items);
    setLog(hydratedLog);
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
        { options: ['취소', '메모 수정', '삭제'], cancelButtonIndex: 0, destructiveButtonIndex: 2 },
        (index) => {
          if (index === 1) router.push(`/cafe/${id}/memo`);
          if (index === 2) handleDeleteLog();
        },
      );
    } else {
      Alert.alert('기록 메뉴', undefined, [
        { text: '메모 수정', onPress: () => router.push(`/cafe/${id}/memo`) },
        { text: '삭제', style: 'destructive', onPress: handleDeleteLog },
        { text: '취소', style: 'cancel' },
      ]);
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

  function handleShare() {
    setSharePreviewOpen(true);
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
  const cafePhotoAspectRatio = parseAspectRatios(log.photo_aspect_ratios)[0] || 1;
  const notePhotoAspectRatios = parseAspectRatios(log.note_photo_aspect_ratios);
  const notePhotoAspectRatio = notePhotoAspectRatios[0] || 1 / 1.4;
  const photoW = screenWidth - 40;
  const headerOnPhoto = cafePhotoUris.length > 0;
  const headerColor = '#1D1D1B';
  const headerGradientColors = headerOnPhoto
    ? (['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.38)', 'rgba(255,255,255,0)'] as const)
    : (['#fff', '#fff', '#fff'] as const);
  return (
    <View className="flex-1 bg-white">
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
        <View className="flex-row items-center h-12">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
            className="items-center justify-center w-10 h-10 rounded-full"
          >
            <Ionicons name="chevron-back" size={24} color={headerColor} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            disabled={isSharing}
            accessibilityRole="button"
            accessibilityLabel={isSharing ? '공유 이미지 만드는 중' : '카페 기록 공유'}
            className="absolute right-0 items-center justify-center w-10 h-10 rounded-full"
            style={{ opacity: isSharing ? 0.45 : 1 }}
          >
            <Ionicons
              name={isSharing ? 'hourglass-outline' : 'share-outline'}
              size={22}
              color={headerColor}
            />
          </TouchableOpacity>

          <Text
            numberOfLines={1}
            className="absolute left-[72px] right-[72px] text-center text-base font-bold"
            style={{ color: headerColor }}
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
          <View className="items-center gap-2 mt-5">
            <FlipCard
              frontUri={notePhotoUris[0]}
              backUri={notePhotoUris[1] ?? null}
              width={photoW * 0.72}
              aspectRatio={notePhotoAspectRatio}
            />
          </View>
        )}

        {cafePhotoUris.length > 0 && (
          <View
            style={{
              width: screenWidth,
              height: screenWidth / cafePhotoAspectRatio,
              backgroundColor: '#ECEDEF',
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
              <View className="absolute bottom-[18px] self-center flex-row items-center gap-[5px] rounded-full bg-black/20 px-2 py-[7px]">
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
                className="absolute bottom-4 right-4 w-[78px] rounded-xl bg-white p-[3px]"
                onPress={() => setNoteCardOpen(true)}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="노트 카드 크게 보기"
                style={{
                  height: 72 / notePhotoAspectRatio + 6,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                <Image
                  source={{ uri: notePhotoUris[0] }}
                  style={{ width: 72, height: 72 / notePhotoAspectRatio, borderRadius: 9 }}
                  contentFit="cover"
                />
                {notePhotoUris.length > 1 && (
                  <View className="absolute bottom-[7px] right-[7px] h-[22px] w-[22px] items-center justify-center rounded-full bg-black/[0.62]">
                    <Ionicons name="copy-outline" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <View className="mx-5 mt-1 rounded-[20px] border border-coffee-separator bg-white p-5">
          <View className="flex-row items-start gap-3">
            <Text className="flex-1 text-2xl font-extrabold tracking-[-0.5px] text-[#1D1D1B]">
              {log.cafe_name}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <TouchableOpacity
                onPress={handleToggleFavorite}
                accessibilityRole="button"
                accessibilityLabel={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
                className="items-center justify-center h-9 w-9"
              >
                <Ionicons
                  name={isFav ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFav ? '#D96C67' : '#70757E'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={showMoreOptions}
                accessibilityRole="button"
                accessibilityLabel="더보기"
                className="items-center justify-center h-9 w-9"
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#70757E" />
              </TouchableOpacity>
            </View>
          </View>
          <View className="mt-4 gap-2.5">
            <View className="flex-row items-center gap-2">
              <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#F1F2F4]">
                <Ionicons name="calendar-outline" size={15} color="#5F636B" />
              </View>
              <Text className="text-sm text-coffee-tan">{log.visited_at}</Text>
            </View>
            {log.address ? (
              <TouchableOpacity
                className="flex-row items-center gap-2"
                onPress={() => {
                  const query = encodeURIComponent(`${log.cafe_name} ${log.address}`);
                  Linking.openURL(`https://map.naver.com/v5/search/${query}`);
                }}
              >
                <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#F1F2F4]">
                  <Ionicons name="location-outline" size={16} color="#5F636B" />
                </View>
                <Text className="flex-1 text-sm text-coffee-muted" numberOfLines={2}>
                  {log.address}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#B8BCC4" />
              </TouchableOpacity>
            ) : null}
          </View>

          {log.memo ? (
            <View className="mt-[18px] flex-row gap-2.5 border-t pl-2 border-coffee-separator pt-4">
              <Ionicons name="chatbubble-ellipses-outline" size={17} color="#8D929B" />
              <Text className="flex-1 text-sm leading-[21px] text-coffee-muted">{log.memo}</Text>
            </View>
          ) : null}
        </View>

        <View className="mt-2">
          <View className="flex-row items-center px-5 mb-3">
            <Text className="text-xl font-extrabold text-coffee">메뉴</Text>
          </View>

          {menuItems.length === 0 && (
            <View className="px-5 py-8 mx-5 border bg-coffee-cream border-coffee-border rounded-2xl">
              <Text className="text-sm text-center text-gray-300">등록된 메뉴가 없어요.</Text>
            </View>
          )}

          {menuItems.length > 0 && (
            <View className="gap-3 px-5">
              {menuItems.map((item) => {
                const category = handripNotesMap[item.id!]
                  ? 'handdip'
                  : getMenuCategory(item.menu_name, item.is_coffee);

                return (
                  <View
                    key={item.id}
                    className="rounded-[18px] border border-coffee-border bg-white p-[18px]"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1 flex-row items-center gap-[11px]">
                        <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-[#F1F2F4]">
                          <Ionicons
                            name={
                              category === 'handdip'
                                ? 'water-outline'
                                : category === 'dessert'
                                  ? 'restaurant-outline'
                                  : 'cafe-outline'
                            }
                            size={18}
                            color="#3F4248"
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-[17px] font-bold text-[#101114]">
                            {item.menu_name}
                          </Text>
                          <Text className="mt-0.5 text-xs text-coffee-soft">
                            {category === 'handdip'
                              ? '핸드드립 노트'
                              : category === 'espresso'
                                ? '커피 노트'
                                : category === 'dessert'
                                  ? '디저트'
                                  : '일반 메뉴'}
                          </Text>
                        </View>
                      </View>
                      <MenuActionDropdown
                        onEdit={
                          category === 'handdip' || category === 'espresso'
                            ? () => router.push(`/cafe/menu/${item.id}/edit`)
                            : undefined
                        }
                        onDelete={() => handleDeleteMenu(item.id!)}
                      />
                    </View>

                    {(category === 'handdip' || category === 'espresso') && (
                      <View className="mb-4 mt-3.5 h-px bg-coffee-separator" />
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

      <CafeLogShareModal
        visible={sharePreviewOpen}
        onClose={() => setSharePreviewOpen(false)}
        log={log}
        menuItems={menuItems}
        handdripNotes={handripNotesMap}
        espressoNotes={espressoNotesMap}
        isSharing={isSharing}
        onSharingChange={setIsSharing}
      />

      <Modal
        transparent
        visible={noteCardOpen}
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setNoteCardOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/[0.72] px-5">
          <Pressable
            className="absolute inset-0"
            onPress={() => setNoteCardOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="카드 상세 닫기"
          />
          <TouchableOpacity
            className="absolute right-4 z-[1] h-10 w-10 items-center justify-center rounded-full bg-white/[0.14]"
            onPress={() => setNoteCardOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="닫기"
            style={{
              top: insets.top + 12,
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          {notePhotoUris.length > 0 && (
            <FlipCard
              frontUri={notePhotoUris[0]}
              backUri={notePhotoUris[1] ?? null}
              width={screenWidth - 40}
              aspectRatio={notePhotoAspectRatio}
            />
          )}
          {notePhotoUris.length > 1 && (
            <Text className="mt-5 text-[13px] text-white/70">카드를 눌러 뒷면 보기</Text>
          )}
        </View>
      </Modal>
    </View>
  );
}
