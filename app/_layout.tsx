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
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#101114',
        headerTitleStyle: { fontWeight: '700' as const },
        headerLeft: ({ canGoBack }) =>
          canGoBack ? (
            <TouchableOpacity onPress={navigation.goBack} className="-ml-1 p-1">
              <Ionicons name="chevron-back" size={26} color="#101114" />
            </TouchableOpacity>
          ) : null,
      })}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="cafe/new" options={{ headerShown: false, presentation: 'card' }} />
      <Stack.Screen name="cafe/[id]" options={{ title: '' }} />
      <Stack.Screen name="cafe/menu/[menuId]/edit" options={{ title: '메뉴 수정' }} />
    </Stack>
  );
}
