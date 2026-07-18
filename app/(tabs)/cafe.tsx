import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { getCafeLogs } from '@/src/db/queries/cafeLogs';
import { CafeLog } from '@/src/types';

import DEFAULT_CARD from '@/assets/default-card.jpg';

const FLAVOR_COLORS: Record<string, string> = {
  베리: '#B784A7',
  블루베리: '#7E8CCF',
  딸기: '#E59A9A',
  체리: '#C96B6B',

  오렌지: '#F2A67E',
  자몽: '#E98F7A',
  사과: '#9BC59D',
  복숭아: '#F4C38D',

  자스민: '#C9B0D9',
  플로럴: '#E7A7C0',
  라벤더: '#B7A8DD',
  로즈: '#D989A7',

  카라멜: '#D2A45F',
  흑설탕: '#A97A5B',
  꿀: '#E6B85C',
  메이플시럽: '#B98563',

  다크초콜릿: '#7B5A48',
  밀크초콜릿: '#A67C67',
  코코아: '#8D6B58',

  아몬드: '#D8B58A',
  헤이즐넛: '#B89063',

  와인: '#9C5A70',
  홍차: '#B06C83',

  스파이스: '#C28A61',
  허브: '#7FA06A',
};

function parseNoteColors(notesJson: string | null | undefined): string[] {
  if (!notesJson) return [];
  try {
    const tags: string[] = JSON.parse(notesJson);
    return tags.map((t) => FLAVOR_COLORS[t]).filter(Boolean);
  } catch {
    return [];
  }
}

function parseAllNotes(concat: string | null | undefined): string[] {
  if (!concat) return [];
  return concat.split('||').flatMap((json) => {
    try {
      return JSON.parse(json) as string[];
    } catch {
      return [];
    }
  });
}

const CAROUSEL_GAP = 16;
const CAROUSEL_INSET = 56;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as typeof FlatList;

// ─── Coverflow animated wrapper ──────────────────────────────────────────────

function CoverflowWrapper({
  index,
  scrollX,
  itemStep,
  cardWidth,
  cardHeight,
  children,
}: {
  index: number;
  scrollX: SharedValue<number>;
  itemStep: number;
  cardWidth: number;
  cardHeight: number;
  children: React.ReactNode;
}) {
  const animStyle = useAnimatedStyle(() => {
    const center = index * itemStep;
    const scale = interpolate(
      scrollX.value,
      [center - itemStep, center, center + itemStep],
      [0.92, 1, 0.92],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      [center - itemStep, center, center + itemStep],
      [0.5, 1, 0.5],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: cardWidth,
          height: cardHeight,
          borderRadius: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.22,
          shadowRadius: 18,
          elevation: 10,
        },
        animStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ─── Log card ─────────────────────────────────────────────────────────────────

function CafeCard({
  item,
  index,
  scrollX,
  cardWidth,
  itemStep,
  screenHeight,
  defaultCardHeight,
  defaultImageHeight,
}: {
  item: CafeLog;
  index: number;
  scrollX: SharedValue<number>;
  cardWidth: number;
  itemStep: number;
  screenHeight: number;
  defaultCardHeight: number;
  defaultImageHeight: number;
}) {
  const router = useRouter();
  const [imgRatio, setImgRatio] = useState<number | null>(null);
  const noteColors = parseNoteColors(item.first_my_notes);
  const firstPhotoUri: string | undefined = (() => {
    const src = item.photos || item.note_photos;
    if (!src) return undefined;
    try {
      return (JSON.parse(src) as string[])[0];
    } catch {
      return undefined;
    }
  })();
  const hasPhoto = !!firstPhotoUri;

  let actualCardWidth = cardWidth;
  let actualCardHeight = defaultCardHeight;
  if (hasPhoto && imgRatio != null) {
    const naturalHeight = cardWidth / imgRatio;
    if (naturalHeight > defaultCardHeight) {
      actualCardHeight = defaultCardHeight;
      actualCardWidth = defaultCardHeight * imgRatio;
    } else {
      actualCardHeight = naturalHeight;
      actualCardWidth = cardWidth;
    }
  }

  const noteGradient =
    noteColors.length > 0
      ? ((noteColors.length === 1 ? [noteColors[0], noteColors[0]] : noteColors) as [
          string,
          string,
          ...string[],
        ])
      : null;

  return (
    <View
      style={{
        width: cardWidth,
        height: screenHeight,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <CoverflowWrapper
        index={index}
        scrollX={scrollX}
        itemStep={itemStep}
        cardWidth={actualCardWidth}
        cardHeight={actualCardHeight}
      >
        <TouchableOpacity
          className="flex-1 overflow-hidden rounded-[24px]"
          onPress={() => router.push(`/cafe/${item.id}`)}
          activeOpacity={0.92}
        >
          {hasPhoto ? (
            <>
              <Image
                source={{ uri: firstPhotoUri! }}
                style={{ width: '100%', flex: 1 }}
                contentFit="cover"
                onLoad={(e) => setImgRatio(e.source.width / e.source.height)}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.72)']}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  paddingHorizontal: 20,
                  paddingTop: 80,
                  paddingBottom: 20,
                }}
              >
                <Text
                  style={{
                    color: 'rgba(255,255,255,0.72)',
                    fontSize: 14,
                    textAlign: 'center',
                    marginBottom: 2,
                  }}
                >
                  {item.visited_at.replace(/-/g, '.')}
                </Text>
                <Text
                  style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}
                  numberOfLines={1}
                >
                  {item.cafe_name}
                </Text>
                {(item.menu_count ?? 0) > 0 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 4,
                      marginTop: 6,
                    }}
                  >
                    {Array.from({ length: item.menu_count! }).map((_, i) => (
                      <Ionicons key={i} name="cafe" size={18} color="rgba(255,255,255,0.85)" />
                    ))}
                  </View>
                )}
                {noteGradient && (
                  <LinearGradient
                    colors={noteGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 6, borderRadius: 4, marginTop: 10 }}
                  />
                )}
              </LinearGradient>
            </>
          ) : (
            <>
              <View>
                <Image
                  source={DEFAULT_CARD}
                  style={{ width: cardWidth, height: defaultImageHeight }}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={['rgba(255,255,255,0)', '#ffffff']}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48 }}
                />
              </View>
              <View
                className="flex-1 bg-white px-5 pt-3 justify-center gap-1.5"
                style={{ paddingBottom: noteColors.length > 0 ? 6 : 14 }}
              >
                <Text className="text-lg text-center text-gray-400">
                  {item.visited_at.replace(/-/g, '.')}
                </Text>
                <Text className="text-xl font-bold text-[#222] text-center" numberOfLines={1}>
                  {item.cafe_name}
                </Text>
                {(item.menu_count ?? 0) > 0 && (
                  <View className="flex-row justify-center gap-1">
                    {Array.from({ length: item.menu_count! }).map((_, i) => (
                      <Ionicons key={i} name="cafe" size={18} color="#111111" />
                    ))}
                  </View>
                )}
                {noteGradient && (
                  <LinearGradient
                    colors={noteGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 6, borderRadius: 4, marginTop: 4 }}
                  />
                )}
              </View>
            </>
          )}
        </TouchableOpacity>
      </CoverflowWrapper>
    </View>
  );
}

// ─── Grid card ───────────────────────────────────────────────────────────────

const GRID_GAP = 10;
const GRID_PADDING = 16;

function CafeGridCard({ item }: { item: CafeLog }) {
  const router = useRouter();
  const [imgRatio, setImgRatio] = useState<number | null>(null); // width / height
  const noteColors = parseNoteColors(item.first_my_notes);
  const firstPhotoUri: string | undefined = (() => {
    const src = item.photos || item.note_photos;
    if (!src) return undefined;
    try {
      return (JSON.parse(src) as string[])[0];
    } catch {
      return undefined;
    }
  })();

  const noteGradient =
    noteColors.length > 0
      ? ((noteColors.length === 1 ? [noteColors[0], noteColors[0]] : noteColors) as [
          string,
          string,
          ...string[],
        ])
      : null;

  return (
    <View
      style={{
        width: '100%',
        borderRadius: 16,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <TouchableOpacity
        onPress={() => router.push(`/cafe/${item.id}`)}
        activeOpacity={0.9}
        style={{ borderRadius: 16, overflow: 'hidden' }}
      >
        {firstPhotoUri ? (
          // 실제 이미지 비율 반영 — onLoad 전에는 3:4 portrait 기본값
          <View style={{ aspectRatio: imgRatio ?? 3 / 4 }}>
            <Image
              source={{ uri: firstPhotoUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              onLoad={(e) => setImgRatio(e.source.width / e.source.height)}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: 12,
                paddingTop: 50,
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginBottom: 2 }}>
                {item.visited_at.replace(/-/g, '.')}
              </Text>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                {item.cafe_name}
              </Text>
              {noteGradient && (
                <LinearGradient
                  colors={noteGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 3, borderRadius: 2, marginTop: 6 }}
                />
              )}
            </LinearGradient>
          </View>
        ) : (
          <>
            <View style={{ aspectRatio: 4 / 3 }}>
              <Image
                source={DEFAULT_CARD}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
              <LinearGradient
                colors={['rgba(255,255,255,0)', '#fff']}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32 }}
              />
            </View>
            <View style={{ padding: 12, backgroundColor: '#fff' }}>
              <Text style={{ color: '#bbb', fontSize: 11, marginBottom: 3 }}>
                {item.visited_at.replace(/-/g, '.')}
              </Text>
              <Text
                style={{ color: '#222', fontSize: 13, fontWeight: '700', lineHeight: 19 }}
                numberOfLines={2}
              >
                {item.cafe_name}
              </Text>
              {(item.menu_count ?? 0) > 0 && (
                <View style={{ flexDirection: 'row', gap: 3, marginTop: 7 }}>
                  {Array.from({ length: item.menu_count! }).map((_, i) => (
                    <Ionicons key={i} name="cafe" size={13} color="#111111" />
                  ))}
                </View>
              )}
              {noteGradient && (
                <LinearGradient
                  colors={noteGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 3, borderRadius: 2, marginTop: 7 }}
                />
              )}
            </View>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Greedy masonry: assign each item to the shorter column.
// Photo cards default to 3:4 portrait for estimation; no-photo cards = image(4:3) + text area.
function splitIntoMasonryColumns(items: CafeLog[], cardWidth: number): [CafeLog[], CafeLog[]] {
  const photoH = cardWidth * (4 / 3); // 3:4 portrait default
  const noPhotoH = cardWidth * (3 / 4) + 72; // 4:3 thumbnail + text
  const left: CafeLog[] = [];
  const right: CafeLog[] = [];
  let lh = 0,
    rh = 0;
  for (const item of items) {
    const h = item.photos || item.note_photos ? photoH : noPhotoH;
    if (lh <= rh) {
      left.push(item);
      lh += h + GRID_GAP;
    } else {
      right.push(item);
      rh += h + GRID_GAP;
    }
  }
  return [left, right];
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CafeScreen() {
  const [logs, setLogs] = useState<CafeLog[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [favOnly, setFavOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'coverflow' | 'grid'>('coverflow');
  const [listHeight, setListHeight] = useState(0);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();

  const cardWidth = screenWidth - CAROUSEL_INSET * 2;
  const itemStep = cardWidth + CAROUSEL_GAP;
  const gridCardWidth = (screenWidth - GRID_PADDING * 2 - GRID_GAP) / 2;

  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const listRef = useRef<any>(null);
  const initialScrollDone = useRef(false);

  const uniqueTags = useMemo(() => {
    const seen = new Set<string>();
    for (const log of logs) {
      parseAllNotes(log.all_my_notes_concat).forEach((t) => seen.add(t));
    }
    return Array.from(seen);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (favOnly && !log.is_favorite) return false;
      if (activeTags.length > 0) {
        const tags = parseAllNotes(log.all_my_notes_concat);
        if (!activeTags.some((t) => tags.includes(t))) return false;
      }
      return true;
    });
  }, [logs, favOnly, activeTags]);

  const [masonryLeft, masonryRight] = useMemo(
    () => splitIntoMasonryColumns(filteredLogs, gridCardWidth),
    [filteredLogs, gridCardWidth],
  );

  function toggleTag(tag: string) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  useFocusEffect(
    useCallback(() => {
      getCafeLogs().then((data) => {
        setLogs(data);
        if (!initialScrollDone.current && data.length > 0) {
          initialScrollDone.current = true;
          scrollX.value = 0;
          requestAnimationFrame(() => {
            listRef.current?.scrollToIndex({ index: 0, animated: false });
          });
        }
      });
    }, []),
  );

  useEffect(() => {
    if (!initialScrollDone.current) return;
    scrollX.value = 0;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: 0, animated: false });
    });
  }, [activeTags, favOnly]);

  const showFilterBar = logs.length > 0;
  const cardAreaHeight = listHeight || screenHeight;
  const defaultCardHeight = cardAreaHeight * 0.72;
  const defaultImageHeight = defaultCardHeight * 0.62;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <Text style={{ flex: 1, fontSize: 24, fontWeight: '800', color: '#111' }}>카페</Text>
        <TouchableOpacity
          onPress={() => setViewMode((v) => (v === 'coverflow' ? 'grid' : 'coverflow'))}
          style={{ padding: 6, marginRight: 4 }}
        >
          <Ionicons
            name={viewMode === 'coverflow' ? 'grid-outline' : 'albums-outline'}
            size={22}
            color="#111"
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/cafe/new')} style={{ padding: 6 }}>
          <Ionicons name="add" size={26} color="#111" />
        </TouchableOpacity>
      </View>

      {/* 필터 바 */}
      {showFilterBar && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          style={{ flexGrow: 0, paddingBottom: 10 }}
        >
          <TouchableOpacity
            onPress={() => setFavOnly((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              backgroundColor: favOnly ? '#111111' : '#fff',
              borderWidth: 1,
              borderColor: '#ccc',
            }}
          >
            <Ionicons
              name={favOnly ? 'star' : 'star-outline'}
              size={14}
              color={favOnly ? '#FFD166' : '#999'}
            />
            <Text style={{ fontSize: 13, fontWeight: '600', color: favOnly ? '#fff' : '#666' }}>
              즐겨찾기
            </Text>
          </TouchableOpacity>

          {uniqueTags.map((tag) => {
            const isActive = activeTags.includes(tag);
            const color = FLAVOR_COLORS[tag] ?? '#111111';
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => toggleTag(tag)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: isActive ? color : '#fff',
                  borderWidth: 1,
                  borderColor: isActive ? color : '#ccc',
                }}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: '600', color: isActive ? '#fff' : '#666' }}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* 콘텐츠 */}
      {viewMode === 'grid' ? (
        filteredLogs.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ color: '#bbb', fontSize: 15 }}>기록이 없어요.</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: GRID_PADDING, paddingBottom: 100 }}
          >
            <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
              <View style={{ flex: 1, gap: GRID_GAP }}>
                {masonryLeft.map((item) => (
                  <CafeGridCard key={item.id} item={item} />
                ))}
              </View>
              <View style={{ flex: 1, gap: GRID_GAP }}>
                {masonryRight.map((item) => (
                  <CafeGridCard key={item.id} item={item} />
                ))}
              </View>
            </View>
          </ScrollView>
        )
      ) : (
        <AnimatedFlatList
          ref={listRef}
          data={filteredLogs}
          keyExtractor={(item) => String((item as CafeLog).id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: CAROUSEL_INSET, gap: CAROUSEL_GAP }}
          style={{ flex: 1, marginBottom: 90 }}
          snapToInterval={itemStep}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={scrollHandler as any}
          onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
          getItemLayout={(_data, index) => ({
            length: cardWidth,
            offset: CAROUSEL_INSET + index * itemStep,
            index,
          })}
          ListEmptyComponent={
            <View
              style={{
                width: screenWidth - CAROUSEL_INSET * 2,
                justifyContent: 'center',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <Text style={{ color: '#bbb', fontSize: 15 }}>
                + 버튼으로 첫 카페를 기록해보세요.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <CafeCard
              item={item as CafeLog}
              index={index}
              scrollX={scrollX}
              cardWidth={cardWidth}
              itemStep={itemStep}
              screenHeight={cardAreaHeight}
              defaultCardHeight={defaultCardHeight}
              defaultImageHeight={defaultImageHeight}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
