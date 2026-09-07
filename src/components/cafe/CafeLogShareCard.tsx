import { forwardRef, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PanResponder, Text, View } from 'react-native';
import { CafeLog, CafeMenuItem, EspressoNote, HanddripNote } from '@/src/types';

// Canvas dimensions are exported at 3× resolution.
export const SHARE_CARD_WIDTH = 360;
export const SHARE_CARD_HEIGHTS = { feed: 450, story: 640 } as const;
export type ShareCardFormat = keyof typeof SHARE_CARD_HEIGHTS;

export type ShareCardVisibility = {
  date: boolean;
  address: boolean;
  menu: boolean;
  memo: boolean;
  branding: boolean;
};

export type ShareCardDecoration = {
  textColor: 'white' | 'black';
  textAlign: 'left' | 'center' | 'right';
  fontStyle: 'default' | 'handwriting' | 'retro' | 'myeongjo';
  fontScale: number;
  gradient: boolean;
  cardBackground: 'default' | 'white';
};

export type ShareCardInfoPosition = { x: number; y: number };

type Props = {
  height?: number;
  log: CafeLog;
  menuItems: CafeMenuItem[];
  handdripNotes: Record<number, HanddripNote>;
  espressoNotes: Record<number, EspressoNote>;
  photoUri?: string;
  photoFit?: 'cover' | 'contain';
  photoAspectRatio?: number;
  visibility: ShareCardVisibility;
  decoration: ShareCardDecoration;
  infoPosition: ShareCardInfoPosition;
  draggable?: boolean;
  interactionScale?: number;
  onInfoPositionChange?: (position: ShareCardInfoPosition) => void;
};

function getMenuDescription(
  item: CafeMenuItem,
  handdripNotes: Record<number, HanddripNote>,
  espressoNotes: Record<number, EspressoNote>,
) {
  const handdrip = handdripNotes[item.id!];
  if (handdrip) {
    const notes = handdrip.my_notes?.length ? handdrip.my_notes : handdrip.official_notes;
    return [handdrip.is_blend ? 'Blend' : handdrip.origin, notes?.slice(0, 3).join(' · ')]
      .filter(Boolean)
      .join('  /  ');
  }
  return espressoNotes[item.id!]?.tags?.slice(0, 3).join(' · ') ?? '';
}

function MenuList({
  items,
  handdripNotes,
  espressoNotes,
  textColor = 'white',
  textAlign = 'left',
  fontFamily = 'Pretendard',
  useRegularWeight = false,
  fontScale = 1,
}: {
  items: CafeMenuItem[];
  handdripNotes: Record<number, HanddripNote>;
  espressoNotes: Record<number, EspressoNote>;
  textColor?: 'white' | 'black';
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: string;
  useRegularWeight?: boolean;
  fontScale?: number;
}) {
  const primaryColor = textColor === 'white' ? '#FFFFFF' : '#101114';
  const secondaryColor = textColor === 'white' ? '#D8DADE' : '#3F4248';
  return (
    <View style={{ gap: 11 * fontScale }}>
      {items.slice(0, 3).map((item, index) => {
        const detail = getMenuDescription(item, handdripNotes, espressoNotes);
        return (
          <View key={item.id ?? index} className="flex-row">
            <View className="flex-1">
              <Text
                className="font-bold"
                style={{
                  color: primaryColor,
                  textAlign,
                  fontFamily,
                  fontSize: 14 * fontScale,
                  ...(useRegularWeight ? { fontWeight: '400' as const } : {}),
                }}
              >
                {item.menu_name}
              </Text>
              {detail ? (
                <Text
                  style={{
                    marginTop: 3 * fontScale,
                    color: secondaryColor,
                    textAlign,
                    fontFamily,
                    fontSize: 10.5 * fontScale,
                  }}
                >
                  {detail}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export const CafeLogShareCard = forwardRef<View, Props>(function CafeLogShareCard(
  {
    height = SHARE_CARD_HEIGHTS.story,
    log,
    menuItems,
    handdripNotes,
    espressoNotes,
    photoUri,
    photoFit = 'cover',
    photoAspectRatio = 1 / 1.4,
    visibility,
    decoration,
    infoPosition,
    draggable = false,
    interactionScale = 1,
    onInfoPositionChange,
  },
  ref,
) {
  const infoWidth = Math.min(312, 240 * decoration.fontScale);
  const halfInfoWidth = infoWidth / 2;
  const horizontalLimit = halfInfoWidth / SHARE_CARD_WIDTH;
  const [infoHeight, setInfoHeight] = useState(160);
  const [alignmentGuides, setAlignmentGuides] = useState<{
    vertical: number | null;
    horizontal: number | null;
  }>({ vertical: null, horizontal: null });
  const positionRef = useRef(infoPosition);
  const dragStartRef = useRef(infoPosition);
  const scaleRef = useRef(interactionScale);
  const cardHeightRef = useRef(height);
  const infoHeightRef = useRef(infoHeight);
  const infoWidthRef = useRef(infoWidth);
  const onPositionChangeRef = useRef(onInfoPositionChange);
  const verticalLimit = Math.min(infoHeight, height) / 2 / height;
  const renderedInfoPosition = {
    x: Math.max(horizontalLimit, Math.min(1 - horizontalLimit, infoPosition.x)),
    y: Math.max(verticalLimit, Math.min(1 - verticalLimit, infoPosition.y)),
  };
  positionRef.current = renderedInfoPosition;
  scaleRef.current = interactionScale;
  cardHeightRef.current = height;
  infoHeightRef.current = infoHeight;
  infoWidthRef.current = infoWidth;
  onPositionChangeRef.current = onInfoPositionChange;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
      onPanResponderGrant: () => {
        dragStartRef.current = positionRef.current;
      },
      onPanResponderMove: (_event, gesture) => {
        const scale = Math.max(scaleRef.current, 0.01);
        const height = cardHeightRef.current;
        const halfWidth = infoWidthRef.current / 2;
        const horizontalLimit = halfWidth / SHARE_CARD_WIDTH;
        const halfHeightRatio = Math.min(infoHeightRef.current, height) / 2 / height;
        const halfHeight = infoHeightRef.current / 2;
        const snapThreshold = 8;
        let nextX = dragStartRef.current.x * SHARE_CARD_WIDTH + gesture.dx / scale;
        let nextY = dragStartRef.current.y * height + gesture.dy / scale;
        let verticalGuide: number | null = null;
        let horizontalGuide: number | null = null;

        if (Math.abs(nextX - SHARE_CARD_WIDTH / 2) <= snapThreshold) {
          nextX = SHARE_CARD_WIDTH / 2;
          verticalGuide = SHARE_CARD_WIDTH / 2;
        } else if (Math.abs(nextX - halfWidth - 24) <= snapThreshold) {
          nextX = halfWidth + 24;
          verticalGuide = 24;
        } else if (Math.abs(nextX + halfWidth - (SHARE_CARD_WIDTH - 24)) <= snapThreshold) {
          nextX = SHARE_CARD_WIDTH - 24 - halfWidth;
          verticalGuide = SHARE_CARD_WIDTH - 24;
        }

        if (Math.abs(nextY - height / 2) <= snapThreshold) {
          nextY = height / 2;
          horizontalGuide = height / 2;
        } else if (Math.abs(nextY - halfHeight - 24) <= snapThreshold) {
          nextY = halfHeight + 24;
          horizontalGuide = 24;
        } else if (Math.abs(nextY + halfHeight - (height - 24)) <= snapThreshold) {
          nextY = height - 24 - halfHeight;
          horizontalGuide = height - 24;
        }

        setAlignmentGuides({ vertical: verticalGuide, horizontal: horizontalGuide });
        onPositionChangeRef.current?.({
          x: Math.max(horizontalLimit, Math.min(1 - horizontalLimit, nextX / SHARE_CARD_WIDTH)),
          y: Math.max(halfHeightRatio, Math.min(1 - halfHeightRatio, nextY / height)),
        });
      },
      onPanResponderRelease: () => {
        setAlignmentGuides({ vertical: null, horizontal: null });
      },
      onPanResponderTerminate: () => {
        setAlignmentGuides({ vertical: null, horizontal: null });
      },
    }),
  ).current;
  const isWhiteText = decoration.textColor === 'white';
  const primaryColor = isWhiteText ? '#FFFFFF' : '#101114';
  const secondaryColor = isWhiteText ? '#D8DADE' : '#3F4248';
  const dividerColor = isWhiteText ? 'rgba(255,255,255,0.3)' : 'rgba(16,17,20,0.3)';
  const fontFamily = {
    default: 'Pretendard',
    handwriting: 'Handwriting',
    retro: 'PuzzleSans',
    myeongjo: 'Myeongjo',
  }[decoration.fontStyle];
  const fontScale = decoration.fontScale;
  const useRegularWeight =
    decoration.fontStyle === 'handwriting' || decoration.fontStyle === 'retro';
  const titleLineHeight =
    decoration.fontStyle === 'retro'
      ? 43
      : decoration.fontStyle === 'handwriting'
        ? 41
        : decoration.fontStyle === 'myeongjo'
          ? 39
          : 35;
  const memoLineHeight = decoration.fontStyle === 'retro' ? 20 : 16;
  const addressAlignItems =
    decoration.textAlign === 'left'
      ? 'flex-start'
      : decoration.textAlign === 'right'
        ? 'flex-end'
        : 'center';
  const menuProps = {
    items: menuItems,
    handdripNotes,
    espressoNotes,
    textColor: decoration.textColor,
    textAlign: decoration.textAlign,
    fontFamily,
    useRegularWeight,
    fontScale,
  };

  return (
    <View
      ref={ref}
      collapsable={false}
      className="overflow-hidden bg-coffee-dark"
      style={{ width: SHARE_CARD_WIDTH, height }}
    >
      {photoUri && photoFit === 'cover' ? (
        <Image
          source={{ uri: photoUri }}
          style={{ position: 'absolute', inset: 0, backgroundColor: '#101114' }}
          contentFit="cover"
        />
      ) : photoUri && photoFit === 'contain' ? (
        decoration.cardBackground === 'white' ? (
          <View className="absolute inset-0 bg-white" />
        ) : (
          <Image
            source={require('../../../assets/default-card.jpg')}
            style={{ position: 'absolute', inset: 0 }}
            contentFit="cover"
          />
        )
      ) : (
        <LinearGradient
          colors={['#2758BE', '#08276F']}
          style={{ position: 'absolute', inset: 0 }}
        />
      )}
      {photoUri && photoFit === 'contain' ? (
        <View className="absolute inset-0 items-center justify-center">
          <View
            className="w-72 rounded-[14px] bg-white p-1"
            style={{
              aspectRatio: photoAspectRatio,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 18,
              elevation: 12,
            }}
          >
            <Image
              source={{ uri: photoUri }}
              style={{ width: '100%', height: '100%', borderRadius: 10 }}
              contentFit="cover"
            />
          </View>
        </View>
      ) : null}
      {decoration.gradient ? (
        <LinearGradient
          colors={
            infoPosition.y < 0.4
              ? ['rgba(5,6,8,0.8)', 'rgba(5,6,8,0.04)', 'rgba(5,6,8,0)']
              : infoPosition.y > 0.6
                ? ['rgba(5,6,8,0)', 'rgba(5,6,8,0.04)', 'rgba(5,6,8,0.8)']
                : ['rgba(5,6,8,0.12)', 'rgba(5,6,8,0.5)', 'rgba(5,6,8,0.12)']
          }
          locations={infoPosition.y >= 0.4 && infoPosition.y <= 0.6 ? [0, 0.5, 1] : [0, 0.54, 1]}
          style={{ position: 'absolute', inset: 0 }}
        />
      ) : null}
      {visibility.branding ? (
        <Text
          className="absolute left-6 top-6 font-extrabold tracking-[2px]"
          style={{
            color: primaryColor,
            fontFamily,
            fontSize: 11 * fontScale,
            ...(useRegularWeight ? { fontWeight: '400' as const } : {}),
          }}
        >
          SANMI
        </Text>
      ) : null}
      {draggable && alignmentGuides.vertical !== null ? (
        <View
          pointerEvents="none"
          className="absolute top-0 bottom-0 z-50 w-px bg-accent"
          style={{ left: alignmentGuides.vertical }}
        />
      ) : null}
      {draggable && alignmentGuides.horizontal !== null ? (
        <View
          pointerEvents="none"
          className="absolute left-0 right-0 z-50 h-px bg-accent"
          style={{ top: alignmentGuides.horizontal }}
        />
      ) : null}
      <View
        {...(draggable ? panResponder.panHandlers : {})}
        onLayout={(event) => setInfoHeight(event.nativeEvent.layout.height)}
        className="absolute"
        style={{
          width: infoWidth,
          left: renderedInfoPosition.x * SHARE_CARD_WIDTH - halfInfoWidth,
          top: Math.max(0, renderedInfoPosition.y * height - infoHeight / 2),
        }}
      >
        <Text
          className="w-full font-extrabold"
          style={{
            letterSpacing: -1.3 * fontScale,
            color: primaryColor,
            textAlign: decoration.textAlign,
            fontFamily,
            fontSize: 32 * fontScale,
            lineHeight: titleLineHeight * fontScale,
            ...(useRegularWeight ? { fontWeight: '400' as const } : {}),
          }}
        >
          {log.cafe_name}
        </Text>
        {visibility.address && log.address ? (
          <View
            className="w-full"
            style={{ alignItems: addressAlignItems, marginTop: 8 * fontScale }}
          >
            <View className="flex-row items-center max-w-full" style={{ gap: 4 * fontScale }}>
              <Ionicons name="location-outline" size={14 * fontScale} color={primaryColor} />
              <Text
                className="shrink"
                style={{
                  color: primaryColor,
                  fontFamily,
                  fontSize: 14 * fontScale,
                  textAlign: decoration.textAlign,
                }}
              >
                {log.address}
              </Text>
            </View>
          </View>
        ) : null}
        {visibility.memo && log.memo ? (
          <Text
            className="w-full"
            style={{
              marginTop: 8 * fontScale,
              color: secondaryColor,
              textAlign: decoration.textAlign,
              fontFamily,
              fontSize: 12 * fontScale,
              lineHeight: memoLineHeight * fontScale,
            }}
          >
            “{log.memo}”
          </Text>
        ) : null}
        {visibility.menu && menuItems.length > 0 && (
          <View
            className="w-full border-t"
            style={{
              borderTopColor: dividerColor,
              marginTop: 18 * fontScale,
              paddingTop: 16 * fontScale,
            }}
          >
            <MenuList {...menuProps} />
          </View>
        )}
      </View>
    </View>
  );
});
