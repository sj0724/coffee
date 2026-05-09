import { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getRecipe, deleteRecipe, toggleFavorite } from '@/src/db/queries/recipes';
import { getRecipeSteps } from '@/src/db/queries/recipeSteps';
import { getBrewLogs } from '@/src/db/queries/brewLogs';
import { Recipe, RecipeStep, BrewLog } from '@/src/types';

export default function BrewDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [logs, setLogs] = useState<BrewLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id]),
  );

  async function loadData() {
    const recipeId = Number(id);
    const [r, s, l] = await Promise.all([
      getRecipe(recipeId),
      getRecipeSteps(recipeId),
      getBrewLogs(recipeId),
    ]);
    setRecipe(r);
    setSteps(s);
    setLogs(l);
  }

  async function handleDelete() {
    Alert.alert('삭제', '이 레시피를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteRecipe(Number(id));
          router.back();
        },
      },
    ]);
  }

  async function handleToggleFavorite() {
    if (!recipe) return;
    const next = recipe.is_favorite !== 1;
    await toggleFavorite(Number(id), next);
    setRecipe((r) => (r ? { ...r, is_favorite: next ? 1 : 0 } : r));
  }

  if (!recipe) return <View className="flex-1 bg-coffee-light" />;

  return (
    <ScrollView
      className="flex-1 bg-coffee-light"
      contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }}
    >
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Text className="text-[22px] font-bold text-[#222]">{recipe.name}</Text>
          <Text className="text-sm text-coffee mt-1">{recipe.brew_method}</Text>
        </View>
        <TouchableOpacity className="p-1" onPress={handleToggleFavorite}>
          <Ionicons
            name={recipe.is_favorite === 1 ? 'heart' : 'heart-outline'}
            size={24}
            color="#E76F51"
          />
        </TouchableOpacity>
        <TouchableOpacity className="p-1" onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color="#E76F51" />
        </TouchableOpacity>
      </View>

      <View className="bg-white rounded-xl p-4 gap-3 shadow-sm">
        <Text className="text-[15px] font-bold text-[#333]">레시피 정보</Text>
        <View className="flex-row flex-wrap gap-2.5">
          {recipe.bean_name && <InfoItem label="원두" value={recipe.bean_name} />}
          {recipe.bean_amount != null && (
            <InfoItem label="원두량" value={`${recipe.bean_amount}g`} />
          )}
          {recipe.water_amount != null && (
            <InfoItem label="물" value={`${recipe.water_amount}ml`} />
          )}
          {recipe.water_temp != null && (
            <InfoItem label="물 온도" value={`${recipe.water_temp}°C`} />
          )}
          {recipe.grind_size && <InfoItem label="분쇄도" value={recipe.grind_size} />}
          {recipe.bean_amount != null && recipe.water_amount != null && (
            <InfoItem
              label="비율"
              value={`1:${(recipe.water_amount / recipe.bean_amount).toFixed(1)}`}
            />
          )}
        </View>
        {recipe.memo ? (
          <Text className="text-sm text-[#555] leading-5">{recipe.memo}</Text>
        ) : null}
      </View>

      {steps.length > 0 && (
        <View className="bg-white rounded-xl p-4 gap-3 shadow-sm">
          <View className="flex-row justify-between items-center">
            <Text className="text-[15px] font-bold text-[#333]">단계별 레시피</Text>
            <TouchableOpacity
              className="flex-row items-center gap-1 bg-coffee rounded-full px-3 py-1.5"
              onPress={() => router.push(`/brew/timer/${id}`)}
            >
              <Ionicons name="timer-outline" size={16} color="#fff" />
              <Text className="text-white text-[13px] font-semibold">타이머 시작</Text>
            </TouchableOpacity>
          </View>
          {steps.map((step, i) => (
            <View key={step.id} className="flex-row gap-3 items-start">
              <View className="w-7 h-7 rounded-full bg-coffee justify-center items-center">
                <Text className="text-white text-[13px] font-bold">{i + 1}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-[#222]">{step.title}</Text>
                {step.description ? (
                  <Text className="text-[13px] text-[#666] mt-0.5">{step.description}</Text>
                ) : null}
                {step.duration != null && (
                  <Text className="text-xs text-accent mt-0.5 font-semibold">
                    {step.duration}초
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {logs.length > 0 && (
        <View className="bg-white rounded-xl p-4 gap-3 shadow-sm">
          <Text className="text-[15px] font-bold text-[#333]">추출 기록</Text>
          {logs.map((log) => (
            <View key={log.id} className="border-t border-coffee-separator pt-2.5 gap-0.5">
              <Text className="text-[13px] text-gray-400">{log.brewed_at}</Text>
              {log.rating != null && (
                <Text className="text-base text-accent">{'★'.repeat(log.rating)}</Text>
              )}
              {(log.my_notes?.length ?? 0) > 0 && (
                <Text className="text-[13px] text-[#555]">{log.my_notes!.join(', ')}</Text>
              )}
              {log.memo ? <Text className="text-[13px] text-[#888]">{log.memo}</Text> : null}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="bg-coffee-cream rounded-lg px-3 py-1.5 min-w-[80px] items-center">
      <Text className="text-[11px] text-coffee">{label}</Text>
      <Text className="text-sm font-bold text-coffee mt-0.5">{value}</Text>
    </View>
  );
}
