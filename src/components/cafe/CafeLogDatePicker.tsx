import { useState } from 'react';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import { useCafeLogDraftStore } from '@/src/store/cafeLogDraftStore';

export function CafeLogDatePicker() {
  const [visible, setVisible] = useState(false);
  const { visitedAt, setField } = useCafeLogDraftStore(
    useShallow((state) => ({
      visitedAt: state.visitedAt,
      setField: state.setField,
    })),
  );
  const date = new Date(`${visitedAt}T00:00:00`);

  const handleChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') setVisible(false);
    if (selected) setField('visitedAt', selected.toISOString().slice(0, 10));
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setVisible(true)}
        className="flex-row items-center justify-between rounded-xl border border-coffee-border bg-white p-3.5"
      >
        <Text className="text-[15px] text-coffee">{visitedAt}</Text>
        <Ionicons name="calendar-outline" size={18} color="#8D929B" />
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <Modal transparent animationType="fade" visible={visible}>
          <TouchableOpacity
            className="flex-1 items-center justify-center bg-black/40"
            activeOpacity={1}
            onPress={() => setVisible(false)}
          >
            <View className="w-[90%] items-center rounded-[20px] bg-white p-4">
              <DateTimePicker
                value={date}
                mode="date"
                display="inline"
                onChange={handleChange}
                maximumDate={new Date()}
                locale="ko-KR"
                accentColor="#123C96"
                style={{ width: '100%' }}
              />
              <TouchableOpacity
                className="mt-2 rounded-[10px] bg-accent px-8 py-2.5"
                onPress={() => setVisible(false)}
              >
                <Text className="text-[15px] font-semibold text-white">확인</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {Platform.OS === 'android' && visible && (
        <DateTimePicker
          value={date}
          mode="date"
          display="calendar"
          onChange={handleChange}
          maximumDate={new Date()}
        />
      )}
    </>
  );
}
