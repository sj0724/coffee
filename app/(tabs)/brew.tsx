import { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
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
    <View className="flex-1 bg-coffee-light">
      <FlatList
        data={recipes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-white rounded-xl p-4 flex-row items-center shadow-sm"
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
          <View className="pt-20 items-center">
            <Text className="text-[15px] text-gray-400">레시피가 없어요.</Text>
          </View>
        }
      />
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-coffee justify-center items-center shadow-md"
        onPress={() => router.push('/brew/new')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
