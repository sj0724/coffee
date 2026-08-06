import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { CafeLog } from '@/src/types';

import DEFAULT_CARD from '@/assets/default-card.jpg';

export const FLAVOR_COLORS: Record<string, string> = {
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

export function parseNoteColors(notesJson: string | null | undefined): string[] {
  if (!notesJson) return [];
  try {
    const tags: string[] = JSON.parse(notesJson);
    return tags.map((t) => FLAVOR_COLORS[t]).filter(Boolean);
  } catch {
    return [];
  }
}

export function parseAllNotes(concat: string | null | undefined): string[] {
  if (!concat) return [];
  return concat.split('||').flatMap((json) => {
    try {
      return JSON.parse(json) as string[];
    } catch {
      return [];
    }
  });
}

export const CAROUSEL_GAP = 16;
export const CAROUSEL_INSET = 56;
export const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as typeof FlatList;

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

export function CafeCard({
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
                transition={150}
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
                  ></View>
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

export const GRID_GAP = 10;
export const GRID_PADDING = 16;

export function CafeGridCard({ item }: { item: CafeLog }) {
  const router = useRouter();
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
          // 그리드 높이를 고정해 이미지 로딩 후에도 카드가 움직이지 않게 한다.
          <View style={{ aspectRatio: 3 / 4 }}>
            <Image
              source={{ uri: firstPhotoUri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={150}
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
export function splitIntoMasonryColumns(
  items: CafeLog[],
  cardWidth: number,
): [CafeLog[], CafeLog[]] {
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
