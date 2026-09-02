import { View, Text } from 'react-native';
import { EspressoNote } from '@/src/types';

export function EspressoNoteView({ note }: { note: EspressoNote }) {
  if (note.tags.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-2 mt-2">
      {note.tags.map((tag) => (
        <View
          key={tag}
          className="rounded-full border border-coffee-border bg-[#F4F5F7] px-3.5 py-1.5"
        >
          <Text className="text-[13px] font-semibold text-coffee-muted">{tag}</Text>
        </View>
      ))}
    </View>
  );
}
