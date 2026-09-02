import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, TouchableOpacity, Animated } from 'react-native';
import { useRef, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'ios' ? Math.max(insets.bottom, 12) + 8 : 16;

  const visibleRoutes = state.routes.filter((route) => !!descriptors[route.key].options.tabBarIcon);
  const activeIndex = visibleRoutes.findIndex((r) => r.key === state.routes[state.index].key);

  const [tabBarWidth, setTabBarWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(activeIndex)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeIndex,
      useNativeDriver: true,
      tension: 60,
      friction: 9,
    }).start();
  }, [activeIndex]);

  const tabWidth = tabBarWidth / visibleRoutes.length;

  return (
    <View
      className="absolute left-[110px] right-[110px] h-[60px] flex-row rounded-full border border-coffee-border bg-white shadow-lg"
      pointerEvents="box-none"
      onLayout={(e) => setTabBarWidth(e.nativeEvent.layout.width)}
      style={{
        bottom,
        shadowColor: '#101114',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
      }}
    >
      {/* 슬라이딩 pill */}
      {tabBarWidth > 0 && (
        <Animated.View
          className="absolute bottom-1 left-1 top-1 rounded-full bg-accent"
          style={{
            width: tabWidth - 10,
            transform: [
              {
                translateX: slideAnim.interpolate({
                  inputRange: visibleRoutes.map((_, i) => i),
                  outputRange: visibleRoutes.map((_, i) => i * tabWidth),
                }),
              },
            ],
          }}
        />
      )}

      {visibleRoutes.map((route, i) => {
        const { options } = descriptors[route.key];
        const isFocused = i === activeIndex;

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.8}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            className="flex-1 items-center justify-center"
          >
            {options.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? '#fff' : '#8D929B',
              size: 24,
            })}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="cafe"
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="cafe-outline" size={size + 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="settings-outline" size={size + 2} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
