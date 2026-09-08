import { useMemo } from 'react';
import { Image } from 'expo-image';
import { createNoteCupUri } from './noteCupSvg';

export function NoteCup({ colors }: { colors: string[] }) {
  const uri = useMemo(() => createNoteCupUri(colors), [colors]);

  return (
    <Image
      source={{ uri }}
      style={{ width: 66, height: 60 }}
      contentFit="contain"
      transition={0}
      accessible={false}
    />
  );
}
