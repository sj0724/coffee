import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';

// Store the selected calendar day in local time, without a UTC date shift.
function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateLabel(date: Date) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]})`;
}

export function CafeLogDatePicker() {
  const [visible, setVisible] = useState(false);
  const [pendingDate, setPendingDate] = useState(new Date());
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const close = useCallback(() => {
    if (Platform.OS !== 'ios') {
      setVisible(false);
      return;
    }
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(translateY, { toValue: screenHeight, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [translateY, backdropOpacity, screenHeight]);
  const springBack = useCallback(() => {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 24,
      stiffness: 240,
      mass: 1,
      useNativeDriver: true,
    }).start();
  }, [translateY]);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !closing.current && gesture.dy > 6 && gesture.dy > Math.abs(gesture.dx),
        onPanResponderGrant: () => translateY.stopAnimation(),
        onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 100 || (gesture.dy > 20 && gesture.vy > 0.7)) close();
          else springBack();
        },
        onPanResponderTerminate: springBack,
      }),
    [translateY, close, springBack],
  );
  const animateOpen = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 26,
        stiffness: 220,
        mass: 1,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  };
  const { visitedAt, setField } = useCafeLogDraftStore(
    useShallow((state) => ({ visitedAt: state.visitedAt, setField: state.setField })),
  );
  const date = new Date(`${visitedAt}T00:00:00`);
  const open = () => {
    closing.current = false;
    translateY.setValue(screenHeight);
    backdropOpacity.setValue(0);
    setPendingDate(date);
    setVisible(true);
  };
  const apply = () => {
    setField('visitedAt', dateKey(pendingDate));
    close();
  };

  return (
    <>
      <TouchableOpacity
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`방문일 변경, ${dateLabel(date)}`}
        className="flex-row items-center gap-3 p-4 bg-white border rounded-2xl border-coffee-border"
      >
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#EEF2FA]">
          <Ionicons name="calendar-outline" size={20} color="#123C96" />
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-[15px] font-semibold text-coffee">{dateLabel(date)}</Text>
          <Text className="text-xs text-coffee-tan">
            {visitedAt === dateKey(new Date()) ? '오늘 방문한 카페예요' : '카페에 방문한 날짜'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#8D929B" />
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <Modal
          transparent
          animationType="none"
          visible={visible}
          onRequestClose={close}
          onShow={animateOpen}
        >
          <View className="justify-end flex-1">
            <Animated.View
              className="absolute inset-0 bg-black/40"
              style={{ opacity: backdropOpacity }}
            >
              <Pressable
                className="absolute inset-0"
                onPress={close}
                accessibilityLabel="날짜 선택 닫기"
              />
            </Animated.View>
            <Animated.View
              className="max-h-[90%] w-full max-w-[480px] self-center rounded-t-[28px] bg-white"
              style={{ paddingBottom: Math.max(insets.bottom, 16), transform: [{ translateY }] }}
              accessibilityViewIsModal
            >
              <View {...panResponder.panHandlers}>
                <View className="self-center h-1 mt-3 rounded-full w-9 bg-coffee-border" />
                <View className="flex-row items-center justify-between px-6 pt-5 pb-4">
                  <View className="gap-1">
                    <Text className="text-xl font-bold text-coffee">언제 방문하셨나요?</Text>
                    <Text className="text-[13px] text-coffee-tan">
                      기억하고 싶은 하루를 선택해주세요
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={close}
                    accessibilityLabel="닫기"
                    hitSlop={10}
                    className="h-8 w-8 items-center justify-center rounded-full bg-[#F4F5F7]"
                  >
                    <Ionicons name="close" size={18} color="#5F636B" />
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView bounces={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                <DateTimePicker
                  value={pendingDate}
                  mode="date"
                  display="inline"
                  onChange={(_, selected) => {
                    if (selected) setPendingDate(selected);
                  }}
                  maximumDate={new Date()}
                  locale="ko-KR"
                  themeVariant="light"
                  accentColor="#123C96"
                  style={{ width: '100%' }}
                />
              </ScrollView>
              <View className="flex-row gap-3 px-6 mt-4">
                <TouchableOpacity
                  onPress={apply}
                  className="items-center flex-1 py-4 rounded-2xl bg-accent"
                >
                  <Text className="text-[15px] font-bold text-white">이 날짜로 선택</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && visible && (
        <DateTimePicker
          value={date}
          mode="date"
          display="calendar"
          onChange={(event, selected) => {
            close();
            if (event.type === 'set' && selected) setField('visitedAt', dateKey(selected));
          }}
          maximumDate={new Date()}
          positiveButton={{ label: '선택', textColor: '#123C96' }}
          negativeButton={{ label: '취소', textColor: '#5F636B' }}
        />
      )}
    </>
  );
}
