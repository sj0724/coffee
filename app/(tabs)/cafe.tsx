import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { getCafeLogs } from '@/src/db/queries/cafeLogs';
import { CafeLog } from '@/src/types';
import {
  AnimatedFlatList,
  CafeCard,
  CafeGridCard,
  CAROUSEL_GAP,
  CAROUSEL_INSET,
  FLAVOR_COLORS,
  GRID_GAP,
  GRID_PADDING,
  parseAllNotes,
  splitIntoMasonryColumns,
} from '@/src/components/cafe/CafeLogList';

export default function CafeScreen() {
  const [logs, setLogs] = useState<CafeLog[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [favOnly, setFavOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'coverflow' | 'grid'>('coverflow');
  const [viewTransitioning, setViewTransitioning] = useState(false);
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
  const viewProgress = useSharedValue(1);
  const viewTransitionStyle = useAnimatedStyle(() => ({
    opacity: viewProgress.value,
    transform: [{ scale: 0.985 + viewProgress.value * 0.015 }],
  }));

  const listRef = useRef<any>(null);
  const initialScrollDone = useRef(false);
  const resetCoverflowOnLayout = useRef(true);

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

  function showNextView(nextMode: 'coverflow' | 'grid') {
    if (nextMode === 'coverflow') {
      scrollX.value = 0;
      resetCoverflowOnLayout.current = true;
    }
    setViewMode(nextMode);
    requestAnimationFrame(() => {
      viewProgress.value = withTiming(
        1,
        { duration: 220, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setViewTransitioning)(false);
        },
      );
    });
  }

  function toggleViewMode() {
    if (viewTransitioning) return;
    const nextMode = viewMode === 'coverflow' ? 'grid' : 'coverflow';
    setViewTransitioning(true);
    viewProgress.value = withTiming(
      0,
      { duration: 120, easing: Easing.in(Easing.quad) },
      (finished) => {
        if (finished) runOnJS(showNextView)(nextMode);
        else runOnJS(setViewTransitioning)(false);
      },
    );
  }

  useFocusEffect(
    useCallback(() => {
      getCafeLogs().then((data) => {
        setLogs(data);
        if (!initialScrollDone.current && data.length > 0) {
          initialScrollDone.current = true;
          scrollX.value = 0;
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
            scrollX.value = 0;
          });
        }
      });
    }, []),
  );

  useEffect(() => {
    if (!initialScrollDone.current || viewMode !== 'coverflow') {
      return;
    }
    scrollX.value = 0;
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      scrollX.value = 0;
    });
  }, [activeTags, favOnly, viewMode]);

  const showFilterBar = logs.length > 0;
  const cardAreaHeight = listHeight > 100 ? listHeight : screenHeight;
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
          onPress={toggleViewMode}
          disabled={viewTransitioning}
          activeOpacity={0.6}
          style={{ padding: 6, marginRight: 4, opacity: viewTransitioning ? 0.55 : 1 }}
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
              name={favOnly ? 'heart' : 'heart-outline'}
              size={14}
              color={favOnly ? '#D96C67' : '#817B73'}
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
      <Animated.View style={[{ flex: 1 }, viewTransitionStyle]}>
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
            contentContainerStyle={{
              alignItems: 'center',
              paddingHorizontal: CAROUSEL_INSET,
              gap: CAROUSEL_GAP,
            }}
            style={{ flex: 1, marginBottom: 90 }}
            snapToInterval={itemStep}
            decelerationRate="fast"
            scrollEventThrottle={16}
            onScroll={scrollHandler as any}
            onLayout={(e) => {
              const nextListHeight = e.nativeEvent.layout.height;
              if (nextListHeight > 100) {
                setListHeight(nextListHeight);
              }
              if (resetCoverflowOnLayout.current) {
                resetCoverflowOnLayout.current = false;
                scrollX.value = 0;
                requestAnimationFrame(() => {
                  listRef.current?.scrollToOffset({ offset: 0, animated: false });
                  scrollX.value = 0;
                });
              }
            }}
            getItemLayout={(_data, index) => ({
              length: itemStep,
              offset: index * itemStep,
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
      </Animated.View>
    </SafeAreaView>
  );
}
