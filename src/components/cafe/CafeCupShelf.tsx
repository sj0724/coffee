import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { CafeLog } from '@/src/types';
import { parseNoteColors } from './CafeLogList';

function NoteCup({ colors }: { colors: string[] }) {
  const palette = colors.length ? colors : ['#D8DADE'];
  const gradientColors: [string, string, ...string[]] = [
    palette[0],
    palette[1] ?? palette[0],
    ...palette.slice(2),
  ];
  return (
    <View pointerEvents="none" style={{ width: 66, height: 60 }}>
      <View
        style={{ width: 88, height: 80, transform: [{ scale: 0.75 }], transformOrigin: 'top left' }}
      >
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 2,
            width: 82,
            height: 7,
            borderRadius: 40,
            backgroundColor: 'rgba(16,17,20,0.09)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 19,
            right: 0,
            width: 29,
            height: 36,
            borderRadius: 15,
            borderWidth: 8,
            borderColor: palette[0],
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 12,
            left: 4,
            width: 64,
            height: 63,
            borderTopLeftRadius: 5,
            borderTopRightRadius: 5,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
            overflow: 'hidden',
            backgroundColor: palette[0],
          }}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: 'absolute', inset: 0 }}
          />
          <View
            style={{
              position: 'absolute',
              top: 8,
              bottom: 12,
              left: 7,
              width: 5,
              borderRadius: 3,
              backgroundColor: 'rgba(255,255,255,0.2)',
            }}
          />
        </View>
        <View
          style={{
            position: 'absolute',
            top: 7,
            left: 4,
            width: 64,
            height: 13,
            borderRadius: 32,
            backgroundColor: palette[0],
            borderWidth: 3,
            borderColor: 'rgba(255,255,255,0.45)',
          }}
        />
      </View>
    </View>
  );
}

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
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View className="mb-2 flex-row items-baseline justify-between px-1">
          <Text className="text-sm font-semibold text-coffee">나의 컵 찬장</Text>
          <Text className="text-xs text-coffee-warm">{logs.length}개의 컵</Text>
        </View>
      }
      ListFooterComponent={
        logs.length === 0 ? (
          <Text className="mt-6 text-center text-sm text-coffee-warm">
            표시할 기록이 없어요. 기록을 모아 찬장을 채워보세요.
          </Text>
        ) : null
      }
      renderItem={({ item: row }) => (
        <View>
          <View
            style={{
              height: 110,
              flexDirection: 'row',
              alignItems: 'flex-end',
              paddingHorizontal: 4,
            }}
          >
            {Array.from({ length: columns }, (_, index) => {
              const log = row[index];
              return (
                <View key={log?.id ?? `empty-${index}`} style={{ flex: 1, alignItems: 'center' }}>
                  {log && (
                    <TouchableOpacity
                      onPress={() => router.push(`/cafe/${log.id}`)}
                      accessibilityRole="button"
                      accessibilityLabel={`${log.cafe_name}, ${log.visited_at}, 카페 기록 보기`}
                      activeOpacity={0.65}
                      style={{ paddingTop: 12 }}
                    >
                      <NoteCup colors={parseNoteColors(log.first_my_notes)} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
          <View
            className="bg-accent border-accent-dark"
            style={{
              height: 7,
              borderRadius: 3,
              borderTopWidth: 2,
              shadowColor: '#101114',
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.1,
              shadowRadius: 5,
              elevation: 2,
            }}
          />
        </View>
      )}
    />
  );
}
