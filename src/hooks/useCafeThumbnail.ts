import { useEffect, useState } from 'react';
import { cachedThumbnail, getThumbnail } from '@/src/services/cafePhotos';

export function useCafeThumbnail(original?: string) {
  const [resolved, setResolved] = useState<{ original: string; uri: string } | null>(null);
  useEffect(() => {
    if (!original) return;
    let active = true;
    void getThumbnail(original).then((uri) => {
      if (active) setResolved({ original, uri: uri ?? original });
    });
    return () => {
      active = false;
    };
  }, [original]);
  const uri = original
    ? resolved?.original === original
      ? resolved.uri
      : cachedThumbnail(original)
    : undefined;
  return {
    uri,
    onError: () => { if (original) setResolved({ original, uri: original }); },
  };
}
