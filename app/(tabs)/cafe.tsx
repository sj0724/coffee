import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, SectionList, useWindowDimensions } from 'react-native';
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
import { CafeCupShelf } from '@/src/components/cafe/CafeCupShelf';
import { hydrateCafeLogsImageRatios } from '@/src/services/imageAspectRatios';
import {
  AnimatedFlatList,
  CafeCard,
  CafeGridCard,
  CAROUSEL_GAP,
  CAROUSEL_INSET,
  GRID_GAP,
  GRID_PADDING,
  splitIntoMasonryColumns,
} from '@/src/components/cafe/CafeLogList';

const collectionModes = [
  { key: 'list', label: '기록 목록', icon: 'list-outline' },
  { key: 'shelf', label: '컵 찬장', icon: 'cafe-outline' },
] as const;

const listLayouts = [
  { key: 'coverflow', label: '리스트 보기', icon: 'albums-outline' },
  { key: 'grid', label: '그리드 보기', icon: 'grid-outline' },
] as const;

type ListLayout = (typeof listLayouts)[number]['key'];
type ViewMode = ListLayout | 'shelf';

export default function CafeScreen() {
  const [logs, setLogs] = useState<CafeLog[]>([]);
  const [favOnly, setFavOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('coverflow');
  const [listLayout, setListLayout] = useState<ListLayout>('coverflow');
  const collectionMode = viewMode === 'shelf' ? 'shelf' : 'list';
  const [viewTransitioning, setViewTransitioning] = useState(false);
  const [listHeight, setListHeight] = useState(0);
  const [activeCoverIndex, setActiveCoverIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
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

  const filteredLogs = useMemo(
    () => logs.filter((log) => !favOnly || !!log.is_favorite),
    [logs, favOnly],
  );

  const gridColumns = useMemo(() => {
    const [left, right] = splitIntoMasonryColumns(filteredLogs, gridCardWidth);
    return { key: 'all-cafes', left, right };
  }, [filteredLogs, gridCardWidth]);

  function showNextView(nextMode: ViewMode) {
    if (nextMode === 'coverflow') {
      scrollX.value = 0;
      activeCoverIndexValue.value = 0;
      setActiveCoverIndex(0);
      resetCoverflowOnLayout.current = true;
    }
    if (nextMode !== 'shelf') setListLayout(nextMode);
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

  function changeViewMode(nextMode: ViewMode) {
    if (viewTransitioning || nextMode === viewMode) return;
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
      let active = true;
      getCafeLogs().then(async (data) => {
        const hydratedData = await hydrateCafeLogsImageRatios(data);
        if (!active) return;
        // Returning from detail without edits should not rerender every photo card.
        setLogs((previous) =>
          JSON.stringify(previous) === JSON.stringify(hydratedData) ? previous : hydratedData,
        );
        if (!initialScrollDone.current && data.length > 0) {
          initialScrollDone.current = true;
          scrollX.value = 0;
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
            scrollX.value = 0;
          });
        }
      });
      return () => {
        active = false;
      };
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
  }, [favOnly, viewMode]);

  const cardAreaHeight = listHeight;
  const defaultCardHeight = cardAreaHeight * 0.72;
  const defaultImageHeight = defaultCardHeight * 0.62;

  return (
    <SafeAreaView className="flex-1 bg-coffee-light" edges={['top']}>
      {/* 헤더 */}
      <View className="flex-row items-center px-5 py-3">
        <Text className="flex-1 text-2xl font-extrabold text-coffee">카페</Text>
        <TouchableOpacity
          onPress={() => setFavOnly((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={favOnly ? '전체 기록 보기' : '즐겨찾기만 보기'}
          accessibilityState={{ selected: favOnly }}
          className="mr-1 h-10 w-10 items-center justify-center rounded-full"
        >
          <Ionicons
            name={favOnly ? 'heart' : 'heart-outline'}
            size={20}
            color={favOnly ? '#123C96' : '#70757E'}
          />
        </TouchableOpacity>
        <View className="mr-2 flex-row gap-1">
          {collectionModes.map((mode) => (
            <TouchableOpacity
              key={mode.key}
              onPress={() => changeViewMode(mode.key === 'shelf' ? 'shelf' : listLayout)}
              disabled={viewTransitioning}
              accessibilityRole="button"
              accessibilityLabel={mode.label}
              accessibilityState={{
                selected: collectionMode === mode.key,
                disabled: viewTransitioning,
              }}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{
                backgroundColor: collectionMode === mode.key ? '#F2DF36' : 'transparent',
                opacity: viewTransitioning ? 0.55 : 1,
              }}
            >
              <Ionicons
                name={mode.icon}
                size={20}
                color={collectionMode === mode.key ? '#101114' : '#70757E'}
              />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={() => router.push('/cafe/new')} className="p-1.5">
          <Ionicons name="add" size={26} color="#101114" />
        </TouchableOpacity>
      </View>

      {viewMode !== 'shelf' && (
        <View className="flex-row justify-end px-5 pb-2">
          <View className="flex-row rounded-full bg-coffee-separator/40 p-0.5">
            {listLayouts.map((layout) => (
              <TouchableOpacity
                key={layout.key}
                onPress={() => changeViewMode(layout.key)}
                disabled={viewTransitioning}
                accessibilityRole="button"
                accessibilityLabel={layout.label}
                accessibilityState={{
                  selected: listLayout === layout.key,
                  disabled: viewTransitioning,
                }}
                className="h-9 w-10 items-center justify-center rounded-full"
                style={{
                  backgroundColor: listLayout === layout.key ? '#FFFFFF' : 'transparent',
                }}
              >
                <Ionicons
                  name={layout.icon}
                  size={17}
                  color={listLayout === layout.key ? '#5F636B' : '#A9ADB4'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      {/* 콘텐츠 */}
      <Animated.View style={[{ flex: 1 }, viewTransitionStyle]}>
        {viewMode === 'shelf' ? (
          <CafeCupShelf logs={filteredLogs} />
        ) : viewMode === 'grid' ? (
          filteredLogs.length === 0 ? (
            <View className="items-center pt-20">
              <Text className="text-[15px] text-coffee-warm">기록이 없어요.</Text>
            </View>
          ) : (
            <SectionList
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 100 }}
              sections={[{ ...gridColumns, data: [gridColumns] }]}
              keyExtractor={(group) => group.key}
              stickySectionHeadersEnabled={false}
              showsVerticalScrollIndicator={false}
              renderItem={({ item: group }) => (
                <View style={{ paddingHorizontal: GRID_PADDING }}>
                  <View className="flex-row" style={{ gap: GRID_GAP }}>
                    <View className="flex-1" style={{ gap: GRID_GAP }}>
                      {group.left.map((item) => (
                        <CafeGridCard key={item.id} item={item} />
                      ))}
                    </View>
                    <View className="flex-1" style={{ gap: GRID_GAP }}>
                      {group.right.map((item) => (
                        <CafeGridCard key={item.id} item={item} />
                      ))}
                    </View>
                  </View>
                </View>
              )}
            />
          )
        ) : (
          <View className="flex-1">
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
              className="mb-[90px] flex-1"
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
                  className="flex-1 items-center justify-center"
                  style={{
                    width: screenWidth - CAROUSEL_INSET * 2,
                  }}
                >
                  <Text className="text-[15px] text-coffee-warm">
                    {favOnly ? '즐겨찾기한 기록이 없어요.' : '+ 버튼으로 첫 카페를 기록해보세요.'}
                  </Text>
                </View>
              }
              renderItem={({ item, index }) =>
                listHeight > 100 ? (
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
                ) : null
              }
            />
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}
