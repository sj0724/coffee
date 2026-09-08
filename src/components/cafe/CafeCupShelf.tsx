import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CafeLog } from '@/src/types';
import { parseNoteColors } from './CafeLogList';
import { NoteCup } from './NoteCup';

export function CafeCupShelf({ logs }: { logs: CafeLog[] }) {
  const router = useRouter();
  const columns = 4;
  const rows = Array.from({ length: Math.max(3, Math.ceil(logs.length / columns)) }, (_, index) =>
    logs.slice(index * columns, (index + 1) * columns),
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(_, index) => String(index)}
      className="flex-1 bg-coffee-light"
      contentContainerClassName="px-5 pt-6 pb-[110px]"
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View className="flex-row items-baseline justify-between px-1 mb-2">
          <Text className="text-sm font-semibold text-coffee">나의 컵 찬장</Text>
          <Text className="text-xs text-coffee-warm">{logs.length}개의 컵</Text>
        </View>
      }
      ListFooterComponent={
        logs.length === 0 ? (
          <Text className="mt-6 text-sm text-center text-coffee-warm">
            표시할 기록이 없어요. 기록을 모아 찬장을 채워보세요.
          </Text>
        ) : null
      }
      renderItem={({ item: row }) => (
        <View>
          <View className="h-[110px] flex-row items-end px-1">
            {Array.from({ length: columns }, (_, index) => {
              const log = row[index];
              return (
                <View key={log?.id ?? `empty-${index}`} className="items-center flex-1">
                  {log && (
                    <TouchableOpacity
                      onPress={() => router.push(`/cafe/${log.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`${log.cafe_name}, ${log.visited_at}, 카페 기록 보기`}
                      activeOpacity={0.65}
                      className="pt-3"
                    >
                      <NoteCup colors={parseNoteColors(log.first_my_notes)} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
          <View className="h-[4px] rounded-[3px] border-t-2 border-accent-dark bg-accent shadow-[0_5px_5px_rgba(16,17,20,0.1)] android:elevation-[2]" />
        </View>
      )}
    />
  );
}
