import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRecipes } from '@/src/db/queries/recipes';
import { Recipe } from '@/src/types';

export default function BrewScreen() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecipes().then(setRecipes);
    }, []),
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <FlatList
        data={recipes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="flex-row items-center p-4 bg-white shadow-sm rounded-xl"
            onPress={() => router.push(`/brew/${item.id}`)}
          >
            <View className="flex-1">
              <Text className="text-base font-semibold text-[#222]">{item.name}</Text>
              <Text className="text-sm text-coffee mt-0.5">{item.brew_method}</Text>
              {item.bean_name && (
                <Text className="text-xs text-gray-400 mt-0.5">{item.bean_name}</Text>
              )}
            </View>
            {item.is_favorite === 1 && <Ionicons name="heart" size={20} color="#E76F51" />}
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Text className="text-[15px] text-gray-400">레시피가 없어요.</Text>
          </View>
        }
      />
      <TouchableOpacity
        className="absolute items-center justify-center rounded-full shadow-md bottom-6 right-6 w-14 h-14 bg-coffee"
        onPress={() => router.push('/brew/new')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
