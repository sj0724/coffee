import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getRecipe } from '@/src/db/queries/recipes';
import { getRecipeSteps } from '@/src/db/queries/recipeSteps';
import { createBrewLog } from '@/src/db/queries/brewLogs';
import { useTimerStore } from '@/src/store/timerStore';
import { Recipe } from '@/src/types';

export default function TimerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loaded, setLoaded] = useState(false);

  const {
    steps,
    currentStepIndex,
    timeLeft,
    isRunning,
    isDone,
    initTimer,
    startTimer,
    pauseTimer,
    tick,
    nextStep,
    reset,
  } = useTimerStore();

  useEffect(() => {
    loadData();
    return () => clearInterval(intervalRef.current ?? undefined);
  }, [id]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => tick(), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    if (isDone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleBrewDone();
    }
  }, [isDone]);

  async function loadData() {
    const recipeId = Number(id);
    const [r, s] = await Promise.all([getRecipe(recipeId), getRecipeSteps(recipeId)]);
    setRecipe(r);
    if (s.length > 0) initTimer(s);
    setLoaded(true);
  }

  async function handleBrewDone() {
    Alert.alert('추출 완료!', '이번 추출을 기록할까요?', [
      { text: '기록 안 함', style: 'cancel', onPress: () => router.back() },
      {
        text: '기록하기',
        onPress: async () => {
          await createBrewLog({
            recipe_id: Number(id),
            brewed_at: new Date().toISOString().slice(0, 10),
          });
          router.back();
        },
      },
    ]);
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function handleStepPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    nextStep();
  }

  const currentStep = steps[currentStepIndex];
  const hasTimer = currentStep?.duration != null;
  const progress = steps.length > 0 ? currentStepIndex / steps.length : 0;

  if (!loaded) return <View className="flex-1 bg-coffee-dark" />;

  if (steps.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-coffee-dark">
        <Text className="text-coffee-soft text-base text-center mt-[100px]">
          등록된 단계가 없어요.
        </Text>
        <TouchableOpacity className="self-center mt-5" onPress={() => router.back()}>
          <Text className="text-accent text-[15px]">돌아가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-coffee-dark">
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text className="text-coffee-warm text-[15px] font-semibold">{recipe?.name ?? ''}</Text>
        <TouchableOpacity onPress={reset}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View className="h-[3px] bg-coffee-muted mx-5">
        <View className="h-[3px] bg-accent" style={{ width: `${progress * 100}%` }} />
      </View>

      <View className="items-center mt-3">
        <Text className="text-coffee-tan text-[13px]">
          {currentStepIndex + 1} / {steps.length}
        </Text>
      </View>

      <View className="items-center justify-center flex-1 gap-4 px-8">
        {isDone ? (
          <View className="items-center gap-3">
            <Text className="text-[80px]">☕</Text>
            <Text className="text-[28px] font-bold text-accent">추출 완료!</Text>
          </View>
        ) : (
          <>
            <Text className="text-[28px] font-bold text-coffee-light text-center">
              {currentStep?.title}
            </Text>
            {currentStep?.description ? (
              <Text className="text-base leading-6 text-center text-coffee-soft">
                {currentStep.description}
              </Text>
            ) : null}

            {hasTimer && (
              <Text
                className={`text-[72px] font-extralight ${
                  timeLeft <= 5 && isRunning ? 'text-accent-dark' : 'text-coffee-light'
                }`}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {formatTime(timeLeft)}
              </Text>
            )}

            {!hasTimer && (
              <Text className="mt-2 text-sm text-coffee-tan">완료 후 다음 단계를 눌러주세요</Text>
            )}
          </>
        )}
      </View>

      {!isDone && (
        <View className="items-center gap-4 px-8 pb-6">
          {hasTimer && (
            <TouchableOpacity
              className="items-center justify-center w-20 h-20 rounded-full shadow-md bg-coffee"
              onPress={isRunning ? pauseTimer : startTimer}
            >
              <Ionicons name={isRunning ? 'pause' : 'play'} size={36} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            className="flex-row items-center gap-1.5 bg-coffee-cream rounded-[24px] px-6 py-3"
            onPress={handleStepPress}
          >
            <Text className="text-coffee text-[15px] font-bold">다음 단계</Text>
            <Ionicons name="arrow-forward" size={20} color="#111111" />
          </TouchableOpacity>
        </View>
      )}

      {isDone && (
        <View className="items-center px-8 pb-6">
          <TouchableOpacity
            className="bg-coffee rounded-[24px] px-12 py-4"
            onPress={() => router.back()}
          >
            <Text className="text-base font-bold text-white">완료</Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="flex-row justify-center gap-1.5 pb-8">
        {steps.map((s, i) => (
          <View
            key={s.id}
            className={`h-1.5 rounded-full ${
              i === currentStepIndex
                ? 'bg-accent w-5'
                : i < currentStepIndex
                  ? 'bg-coffee-tan w-1.5'
                  : 'bg-coffee-muted w-1.5'
            }`}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
