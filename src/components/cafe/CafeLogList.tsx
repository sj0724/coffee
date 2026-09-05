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
import { parseAspectRatios } from '@/src/services/imageAspectRatios';

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

function getFirstPhotoUri(item: CafeLog): string | undefined {
  for (const source of [item.photos, item.note_photos]) {
    if (!source) continue;
    try {
      const firstPhoto = (JSON.parse(source) as string[])[0];
      if (firstPhoto) return firstPhoto;
    } catch {
      // Ignore malformed photo data and try the next source.
    }
  }
  return undefined;
}

function getFirstPhotoAspectRatio(item: CafeLog): number | undefined {
  const sources = [
    [item.photos, item.photo_aspect_ratios],
    [item.note_photos, item.note_photo_aspect_ratios],
  ] as const;
  for (const [urisJson, ratiosJson] of sources) {
    if (!urisJson) continue;
    try {
      const uris = JSON.parse(urisJson) as string[];
      if (uris[0]) {
        const ratio = parseAspectRatios(ratiosJson)[0];
        return ratio > 0 ? ratio : undefined;
      }
    } catch {
      // Ignore malformed metadata and try the next photo source.
    }
  }
  return undefined;
}

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
  const imgRatio = getFirstPhotoAspectRatio(item);
  const noteColors = parseNoteColors(item.first_my_notes);
  const firstPhotoUri = getFirstPhotoUri(item);
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
      className="items-center justify-center"
      style={{
        width: cardWidth,
        height: screenHeight,
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
          className="flex-1 overflow-hidden rounded-[8px]"
          onPress={() => router.push(`/cafe/${item.id}`)}
          activeOpacity={0.92}
        >
          {hasPhoto ? (
            <>
              <Image
                source={{ uri: firstPhotoUri! }}
                style={{ width: '100%', flex: 1 }}
                contentFit="cover"
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
                <Text className="mb-0.5 text-center text-sm text-white/70">
                  {item.visited_at.replace(/-/g, '.')}
                </Text>
                <Text className="text-xl font-bold text-center text-white" numberOfLines={1}>
                  {item.cafe_name}
                </Text>
                {(item.menu_count ?? 0) > 0 && (
                  <View className="mt-1.5 flex-row justify-center gap-1" />
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
                  colors={['rgba(255,255,255,0)', '#FFFFFF']}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48 }}
                />
              </View>
              <View
                className="flex-1 bg-coffee-cream px-5 pt-3 justify-center gap-1.5"
                style={{ paddingBottom: noteColors.length > 0 ? 6 : 14 }}
              >
                <Text className="text-lg text-center text-gray-400">
                  {item.visited_at.replace(/-/g, '.')}
                </Text>
                <Text className="text-xl font-bold text-[#101114] text-center" numberOfLines={1}>
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
  const imgRatio = getFirstPhotoAspectRatio(item) ?? 3 / 4;
  const noteColors = parseNoteColors(item.first_my_notes);
  const firstPhotoUri = getFirstPhotoUri(item);

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
      className="w-full bg-white rounded-2xl"
      style={{
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
        className="overflow-hidden rounded-[10px]"
      >
        {firstPhotoUri ? (
          <View style={{ aspectRatio: imgRatio }}>
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
              <Text className="mb-0.5 text-[10px] text-white/70">
                {item.visited_at.replace(/-/g, '.')}
              </Text>
              <Text className="text-[13px] font-bold text-white" numberOfLines={1}>
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
            <View className="aspect-[4/3]">
              <Image
                source={DEFAULT_CARD}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
              <LinearGradient
                colors={['rgba(255,255,255,0)', '#FFFFFF']}
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32 }}
              />
            </View>
            <View className="p-3 bg-white">
              <Text className="mb-[3px] text-[11px] text-coffee-warm">
                {item.visited_at.replace(/-/g, '.')}
              </Text>
              <Text className="text-[13px] font-bold leading-[19px] text-coffee" numberOfLines={2}>
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
  const noPhotoH = cardWidth * (3 / 4) + 72; // 4:3 thumbnail + text
  const left: CafeLog[] = [];
  const right: CafeLog[] = [];
  let lh = 0,
    rh = 0;
  for (const item of items) {
    const hasPhoto = !!getFirstPhotoUri(item);
    const imageRatio = getFirstPhotoAspectRatio(item);
    const h = hasPhoto ? cardWidth / (imageRatio ?? 3 / 4) : noPhotoH;
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
