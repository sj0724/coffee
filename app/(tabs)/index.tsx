import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCafeLogs } from '@/src/db/queries/cafeLogs';
import { getBrewLogs } from '@/src/db/queries/brewLogs';
import { CafeLog, BrewLog } from '@/src/types';

type RecentItem = { type: 'cafe'; data: CafeLog } | { type: 'brew'; data: BrewLog };

export default function HomeScreen() {
  const router = useRouter();
  const [items, setItems] = useState<RecentItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadRecent();
    }, []),
  );

  async function loadRecent() {
    const [cafeLogs, brewLogs] = await Promise.all([getCafeLogs(), getBrewLogs()]);
    const merged: RecentItem[] = [
      ...cafeLogs.slice(0, 5).map((d): RecentItem => ({ type: 'cafe', data: d })),
      ...brewLogs.slice(0, 5).map((d): RecentItem => ({ type: 'brew', data: d })),
    ]
      .sort((a, b) => {
        const dateA = a.type === 'cafe' ? a.data.visited_at : a.data.brewed_at;
        const dateB = b.type === 'cafe' ? b.data.visited_at : b.data.brewed_at;
        return dateB.localeCompare(dateA);
      })
      .slice(0, 10);
    setItems(merged);
  }

  function renderItem({ item }: { item: RecentItem }) {
    if (item.type === 'cafe') {
      const log = item.data;
      return (
        <TouchableOpacity
          className="bg-white rounded-xl p-4 shadow-sm"
          onPress={() => router.push(`/cafe/${log.id}`)}
        >
          <Text className="text-xs text-coffee mb-1">☕ 카페</Text>
          <Text className="text-base font-semibold text-[#222]">
            {log.cafe_name} — {log.menu_name}
          </Text>
          <Text className="text-xs text-gray-400 mt-1">{log.visited_at}</Text>
        </TouchableOpacity>
      );
    }
    const log = item.data;
    return (
      <TouchableOpacity
        className="bg-white rounded-xl p-4 shadow-sm"
        onPress={() => router.push(`/brew/${log.recipe_id}`)}
      >
        <Text className="text-xs text-coffee mb-1">🫗 홈브루</Text>
        <Text className="text-base font-semibold text-[#222]">추출 기록</Text>
        <Text className="text-xs text-gray-400 mt-1">{log.brewed_at}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-1 bg-coffee-light">
      {items.length === 0 ? (
        <View className="flex-1 justify-center items-center gap-2">
          <Text className="text-[15px] text-gray-400">아직 기록이 없어요.</Text>
          <Text className="text-[15px] text-gray-400">카페나 홈브루 탭에서 시작해보세요!</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => `${item.type}-${item.data.id}-${i}`}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
        />
      )}
    </View>
  );
}
