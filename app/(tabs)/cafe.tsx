import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCafeLogs } from '@/src/db/queries/cafeLogs';
import { CafeLog } from '@/src/types';

export default function CafeScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<CafeLog[]>([]);

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
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-white rounded-xl p-4 flex-row items-center shadow-sm"
            onPress={() => router.push(`/cafe/${item.id}`)}
          >
            <View className="flex-1">
              <Text className="text-base font-semibold text-[#222]">{item.cafe_name}</Text>
              <Text className="text-sm text-coffee mt-0.5">{item.menu_name}</Text>
              <Text className="text-xs text-gray-400 mt-1">{item.visited_at}</Text>
            </View>
            {item.rating != null && (
              <Text className="text-base text-accent">{'★'.repeat(item.rating)}</Text>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="pt-20 items-center">
            <Text className="text-[15px] text-gray-400">카페 기록이 없어요.</Text>
          </View>
        }
      />
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-coffee justify-center items-center shadow-md"
        onPress={() => router.push('/cafe/new')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
