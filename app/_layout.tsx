import '../global.css';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { getDB } from '@/src/db';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDB().then(() => setDbReady(true));
  }, []);

  if (!dbReady) {
    return (
      <View className="items-center justify-center flex-1">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const headerOpts = {
    headerStyle: { backgroundColor: '#fff' },
    headerTintColor: '#111111',
    headerTitleStyle: { fontWeight: '700' as const },
  };

  return (
    <Stack screenOptions={headerOpts}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="cafe/new" options={{ title: '카페 기록 추가', presentation: 'modal' }} />
      <Stack.Screen name="cafe/[id]" options={{ title: '카페 기록' }} />
      <Stack.Screen name="brew/new" options={{ title: '레시피 추가', presentation: 'modal' }} />
      <Stack.Screen name="brew/[id]" options={{ title: '레시피' }} />
      <Stack.Screen name="brew/timer/[id]" options={{ title: '타이머', headerShown: false }} />
    </Stack>
  );
}
