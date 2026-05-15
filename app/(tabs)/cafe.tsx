import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, useWindowDimensions } from 'react-native';
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

const SIDE_PADDING = 28;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as typeof FlatList;

type CafeCardProps = {
  item: CafeLog;
  index: number;
  scrollX: SharedValue<number>;
  cardWidth: number;
  screenWidth: number;
  screenHeight: number;
  defaultCardHeight: number;
  defaultImageHeight: number;
};

function CafeCard({
  item,
  index,
  scrollX,
  cardWidth,
  screenWidth,
  screenHeight,
  defaultCardHeight,
  defaultImageHeight,
}: CafeCardProps) {
  const router = useRouter();
  const [imgRatio, setImgRatio] = useState<number | null>(null);
  const noteColors = parseNoteColors(item.first_my_notes);
  const hasPhoto = !!item.photo_uri;

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
      ? ((noteColors.length === 1
          ? [noteColors[0], noteColors[0]]
          : noteColors) as [string, string, ...string[]])
      : null;

  const animStyle = useAnimatedStyle(() => {
    const center = index * screenWidth;
    const rotateY = interpolate(
      scrollX.value,
      [center - screenWidth, center, center + screenWidth],
      [38, 0, -38],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollX.value,
      [center - screenWidth, center, center + screenWidth],
      [0.82, 1, 0.82],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      [center - screenWidth, center, center + screenWidth],
      [0.6, 1, 0.6],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ perspective: 900 }, { rotateY: `${rotateY}deg` }, { scale }],
    };
  });

  return (
    <View
      style={{
        width: screenWidth,
        height: screenHeight,
        paddingHorizontal: hasPhoto ? 0 : SIDE_PADDING,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            width: actualCardWidth,
            height: actualCardHeight,
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
        <TouchableOpacity
          className="flex-1 overflow-hidden rounded-[24px]"
          onPress={() => router.push(`/cafe/${item.id}`)}
          activeOpacity={0.92}
        >
          {hasPhoto ? (
            <>
              <Image
                source={{ uri: item.photo_uri! }}
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
                      <Ionicons key={i} name="cafe" size={18} color="#6F4E37" />
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
      </Animated.View>
    </View>
  );
}

export default function CafeScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<CafeLog[]>([]);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const cardWidth = screenWidth - SIDE_PADDING * 2;
  const defaultCardHeight = screenHeight * 0.62;
  const defaultImageHeight = defaultCardHeight * 0.62;

  const scrollX = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  useFocusEffect(
    useCallback(() => {
      getCafeLogs().then(setLogs);
    }, []),
  );

  return (
    <View className="flex-1 bg-white">
      <AnimatedFlatList
        data={logs}
        keyExtractor={(item) => String((item as CafeLog).id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center' }}
        style={{ flex: 1 }}
        snapToInterval={screenWidth}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={scrollHandler as any}
        renderItem={({ item, index }) => (
          <CafeCard
            item={item as CafeLog}
            index={index}
            scrollX={scrollX}
            cardWidth={cardWidth}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
            defaultCardHeight={defaultCardHeight}
            defaultImageHeight={defaultImageHeight}
          />
        )}
        ListEmptyComponent={
          <View style={{ width: screenWidth }} className="items-center pt-20">
            <Text className="text-[15px] text-gray-400">카페 기록이 없어요.</Text>
          </View>
        }
      />
      <TouchableOpacity
        className="absolute items-center justify-center rounded-full shadow-md bottom-6 right-6 w-14 h-14 bg-coffee"
        onPress={() => router.push('/cafe/new')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
