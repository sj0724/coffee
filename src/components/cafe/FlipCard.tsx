import { useRef, useState } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import DEFAULT_CARD from '@/assets/default-card.jpg';

export function FlipCard({
  frontUri,
  backUri,
  width,
  aspectRatio,
}: {
  frontUri: string;
  backUri: string | null;
  width: number;
  aspectRatio: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const frontH = width / aspectRatio;
  const anim = useRef(new Animated.Value(0)).current;

  function flip() {
    Animated.spring(anim, {
      toValue: flipped ? 0 : 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
    setFlipped((f) => !f);
  }

  const frontRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <TouchableOpacity onPress={flip} activeOpacity={0.95} style={{ width, height: frontH }}>
      {/* 앞면 */}
      <Animated.View
        style={{
          position: 'absolute',
          width,
          height: frontH,
          backfaceVisibility: 'hidden',
          transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
        }}
      >
        <Image
          source={{ uri: frontUri }}
          style={{ width, height: frontH, borderRadius: 14 }}
          contentFit="cover"
        />
      </Animated.View>

      {/* 뒷면 - 앞면과 동일한 사이즈 사용 */}
      <Animated.View
        style={{
          position: 'absolute',
          width,
          height: frontH,
          backfaceVisibility: 'hidden',
          transform: [{ perspective: 1200 }, { rotateY: backRotate }],
        }}
      >
        <Image
          source={backUri ? { uri: backUri } : DEFAULT_CARD}
          style={{ width, height: frontH, borderRadius: 14 }}
          contentFit="cover"
        />
      </Animated.View>
    </TouchableOpacity>
  );
}
