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
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 14,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          borderWidth: 1,
          borderColor: '#C8BFB0',
        }}
      >
        <Text style={{ fontSize: 15, color: '#3A1B0F' }}>{visitedAt}</Text>
        <Ionicons name="calendar-outline" size={18} color="#A59688" />
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <Modal transparent animationType="fade" visible={visible}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.4)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          >
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 20,
                padding: 16,
                width: '90%',
                alignItems: 'center',
              }}
            >
              <DateTimePicker
                value={date}
                mode="date"
                display="inline"
                onChange={handleChange}
                maximumDate={new Date()}
                locale="ko-KR"
                accentColor="#E6531E"
                style={{ width: '100%' }}
              />
              <TouchableOpacity
                style={{
                  marginTop: 8,
                  backgroundColor: '#E6531E',
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 32,
                }}
                onPress={() => setVisible(false)}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>확인</Text>
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
