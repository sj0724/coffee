import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export function NoteDetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row items-start gap-3">
      <Text className="w-[76px] shrink-0 text-[13px] font-semibold leading-6 text-black">
        {label}
      </Text>
      <View className="flex-1 min-w-0">{children}</View>
    </View>
  );
}

export function FlavorDetailRow({ label, notes }: { label: string; notes: string[] }) {
  return (
    <NoteDetailRow label={label}>
      <View className="flex-row flex-wrap gap-y-1">
        {notes.map((note, index) => (
          <Text
            key={`${index}-${note}`}
            className="max-w-full text-[15px] font-semibold leading-6 text-accent"
            lineBreakStrategyIOS="hangul-word"
            android_hyphenationFrequency="none"
          >
            {index > 0 && <Text className="text-coffee-warm"> · </Text>}
            {note}
          </Text>
        ))}
      </View>
    </NoteDetailRow>
  );
}
