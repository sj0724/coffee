import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SectionList,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

function getMonthKey(date: string): string {
  return date.slice(0, 7);
}

function formatMonth(date: string): { month: string; year: string } {
  const [year, month] = getMonthKey(date).split('-');
  return { month: String(Number(month)), year };
}

export default function CafeScreen() {
  const [logs, setLogs] = useState<CafeLog[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [favOnly, setFavOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'coverflow' | 'grid'>('coverflow');
  const [viewTransitioning, setViewTransitioning] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const [activeCoverIndex, setActiveCoverIndex] = useState(0);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const router = useRouter();

  const cardWidth = screenWidth - CAROUSEL_INSET * 2;
  const itemStep = cardWidth + CAROUSEL_GAP;
  const gridCardWidth = (screenWidth - GRID_PADDING * 2 - GRID_GAP) / 2;

  const scrollX = useSharedValue(0);
  const activeCoverIndexValue = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
    const nextIndex = Math.max(0, Math.round(event.contentOffset.x / itemStep));
    if (nextIndex !== activeCoverIndexValue.value) {
      activeCoverIndexValue.value = nextIndex;
      runOnJS(setActiveCoverIndex)(nextIndex);
    }
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

  const monthGroups = useMemo(() => {
    const grouped = new Map<string, CafeLog[]>();
    for (const log of filteredLogs) {
      const key = getMonthKey(log.visited_at);
      const monthLogs = grouped.get(key);
      if (monthLogs) monthLogs.push(log);
      else grouped.set(key, [log]);
    }

    return Array.from(grouped, ([key, monthLogs]) => {
      const [left, right] = splitIntoMasonryColumns(monthLogs, gridCardWidth);
      return { key, label: formatMonth(monthLogs[0].visited_at), left, right };
    });
  }, [filteredLogs, gridCardWidth]);

  const activeCoverLog = filteredLogs[Math.min(activeCoverIndex, filteredLogs.length - 1)];
  const activeMonth = activeCoverLog ? formatMonth(activeCoverLog.visited_at) : null;

  function toggleTag(tag: string) {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function showNextView(nextMode: 'coverflow' | 'grid') {
    if (nextMode === 'coverflow') {
      scrollX.value = 0;
      activeCoverIndexValue.value = 0;
      setActiveCoverIndex(0);
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
    setActiveCoverIndex(0);
    activeCoverIndexValue.value = 0;
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
            <SectionList
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 100 }}
              sections={monthGroups.map((group) => ({ ...group, data: [group] }))}
              keyExtractor={(group) => group.key}
              stickySectionHeadersEnabled={true}
              showsVerticalScrollIndicator={false}
              renderSectionHeader={({ section }) => (
                <LinearGradient
                  colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0.96)', 'rgba(255,255,255,0)']}
                  locations={[0, 0.68, 1]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{
                    width: '100%',
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    gap: 9,
                    paddingHorizontal: GRID_PADDING,
                    paddingTop: 14,
                    paddingBottom: 50,
                    marginBottom: -38,
                    zIndex: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 50,
                      lineHeight: 65,
                      fontWeight: '800',
                      letterSpacing: -1,
                      color: '#292622',
                    }}
                  >
                    {section.label.month}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      letterSpacing: 1.4,
                      color: '#8E877E',
                    }}
                  >
                    {section.label.year}
                  </Text>
                </LinearGradient>
              )}
              renderItem={({ item: group }) => (
                <View style={{ paddingHorizontal: GRID_PADDING }}>
                  <View style={{ flexDirection: 'row', gap: GRID_GAP }}>
                    <View style={{ flex: 1, gap: GRID_GAP }}>
                      {group.left.map((item) => (
                        <CafeGridCard key={item.id} item={item} />
                      ))}
                    </View>
                    <View style={{ flex: 1, gap: GRID_GAP }}>
                      {group.right.map((item) => (
                        <CafeGridCard key={item.id} item={item} />
                      ))}
                    </View>
                  </View>
                </View>
              )}
              renderSectionFooter={() => <View style={{ height: 22 }} />}
            />
          )
        ) : (
          <View style={{ flex: 1 }}>
            {activeMonth && (
              <View
                style={{
                  width: '100%',
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: 10,
                  paddingHorizontal: 24,
                  paddingTop: 10,
                  paddingBottom: 5,
                  backgroundColor: '#fff',
                }}
              >
                <Text
                  style={{
                    fontSize: 70,
                    lineHeight: 85,
                    fontWeight: '800',
                    letterSpacing: -1.2,
                    color: '#292622',
                  }}
                >
                  {activeMonth.month}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    letterSpacing: 1.5,
                    color: '#8E877E',
                  }}
                >
                  {activeMonth.year}
                </Text>
              </View>
            )}
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
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}
