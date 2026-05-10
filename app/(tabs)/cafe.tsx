import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCafeLogs } from '@/src/db/queries/cafeLogs';
import { CafeLog } from '@/src/types';

import DEFAULT_CARD from '@/assets/default-card.jpg';

const NUM_COLUMNS = 3;
const GAP = 8;
const PADDING = 12;

export default function CafeScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<CafeLog[]>([]);
  const { width: screenWidth } = useWindowDimensions();

  const cardWidth = (screenWidth - PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const cardHeight = cardWidth * 1.3;

  useFocusEffect(
    useCallback(() => {
      getCafeLogs().then(setLogs);
    }, []),
  );

  return (
    <View className="flex-1 bg-coffee-light">
      <FlatList
        data={logs}
        keyExtractor={(item) => String(item.id)}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={{ gap: GAP }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ width: cardWidth, height: cardHeight, borderRadius: 15, overflow: 'hidden' }}
            onPress={() => router.push(`/cafe/${item.id}`)}
          >
            <Image
              source={item.photo_uri ? { uri: item.photo_uri } : DEFAULT_CARD}
              style={{ width: cardWidth, height: (cardHeight * 2) / 3 }}
              contentFit="cover"
            />
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: cardHeight / 3,
                height: (cardHeight * 2) / 3,
              }}
            />
            <View
              style={{
                backgroundColor: '#fff',
                height: cardHeight / 3,
                paddingHorizontal: 6,
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text className="text-[#222] text-[15px] font-bold text-center" numberOfLines={1}>
                {item.cafe_name}
              </Text>
              {/* <Text className="text-coffee text-[11px] font-semibold text-center" numberOfLines={1}>
                {item.menu_name}
              </Text> */}
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: PADDING, gap: GAP, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center pt-20">
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
