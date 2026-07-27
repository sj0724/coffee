import { View, Text } from 'react-native';
import { EspressoNote } from '@/src/types';

export function EspressoNoteView({ note }: { note: EspressoNote }) {
  if (note.tags.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-2 mt-2">
      {note.tags.map((tag) => (
        <View
          key={tag}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: '#F2EFEA',
            borderWidth: 1,
            borderColor: '#DED9D1',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#403C37' }}>{tag}</Text>
        </View>
      ))}
    </View>
  );
}
