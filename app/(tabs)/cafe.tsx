import { useCallback, useState } from 'react';
import { View, Text, SectionList, TouchableOpacity, useWindowDimensions } from 'react-native';
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

type Section = { date: string; data: CafeLog[][] };

function groupByDate(logs: CafeLog[]): Section[] {
  const map = new Map<string, CafeLog[]>();
  for (const log of logs) {
    const key = log.visited_at;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  return Array.from(map.entries()).map(([date, items]) => ({
    date,
    data: Array.from({ length: Math.ceil(items.length / NUM_COLUMNS) }, (_, i) =>
      items.slice(i * NUM_COLUMNS, (i + 1) * NUM_COLUMNS),
    ),
  }));
}

export default function CafeScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<CafeLog[]>([]);
  const { width: screenWidth } = useWindowDimensions();

  const cardWidth = (screenWidth - PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const cardHeight = cardWidth * 1.3;
  const sections = groupByDate(logs);

  useFocusEffect(
    useCallback(() => {
      getCafeLogs().then(setLogs);
    }, []),
  );

  return (
    <View className="flex-1 bg-coffee-light">
      <SectionList
        sections={sections}
        keyExtractor={(row, i) => row.map((item) => item.id).join('-') + i}
        renderSectionHeader={({ section }) => (
          <Text
            style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#black',
              paddingHorizontal: PADDING,
              paddingTop: 16,
              paddingBottom: 16,
              backgroundColor: 'transparent',
            }}
          >
            {section.date.replace(/-/g, '.')}
          </Text>
        )}
        renderItem={({ item: row }) => (
          <View
            style={{
              flexDirection: 'row',
              gap: GAP,
              paddingHorizontal: PADDING,
              marginBottom: GAP,
            }}
          >
            {row.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  borderRadius: 15,
                  overflow: 'hidden',
                }}
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
                    gap: 4,
                  }}
                >
                  <Text
                    style={{ fontSize: 15, fontWeight: '700', color: '#222', textAlign: 'center' }}
                    numberOfLines={1}
                  >
                    {item.cafe_name}
                  </Text>
                  {/* <Text
                    style={{ fontSize: 11, color: '#6F4E37', textAlign: 'center' }}
                    numberOfLines={1}
                  >
                    {item.menu_name}
                  </Text> */}
                </View>
              </TouchableOpacity>
            ))}
            {row.length < NUM_COLUMNS &&
              Array.from({ length: NUM_COLUMNS - row.length }).map((_, i) => (
                <View key={i} style={{ width: cardWidth }} />
              ))}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
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
