import '../global.css';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  return (
    <Stack
      screenOptions={({ navigation }) => ({
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#111111',
        headerTitleStyle: { fontWeight: '700' as const },
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <TouchableOpacity onPress={navigation.goBack} style={{ padding: 4, marginLeft: -4 }}>
              <Ionicons name="chevron-back" size={26} color="#111111" />
            </TouchableOpacity>
          ) : null,
      })}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="cafe/new" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="cafe/[id]" options={{ title: '' }} />
      <Stack.Screen name="brew/new" options={{ title: '레시피 추가', presentation: 'modal' }} />
      <Stack.Screen name="brew/[id]" options={{ title: '레시피' }} />
      <Stack.Screen name="brew/timer/[id]" options={{ title: '타이머', headerShown: false }} />
    </Stack>
  );
}
