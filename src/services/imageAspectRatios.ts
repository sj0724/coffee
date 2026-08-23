import { Image } from 'expo-image';
import type { CafeLog } from '@/src/types';
import { updateCafeLogImageRatios } from '@/src/db/queries/cafeLogs';

function parseStringArray(value?: string): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function parseAspectRatios(value?: string): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((ratio) => (typeof ratio === 'number' && ratio > 0 ? ratio : 0))
      : [];
  } catch {
    return [];
  }
}

export async function measureImageAspectRatios(uris: string[]): Promise<number[]> {
  return Promise.all(
    uris.map(async (uri) => {
      try {
        const image = await Image.loadAsync(uri);
        return image.width > 0 && image.height > 0 ? image.width / image.height : 0;
      } catch {
        return 0;
      }
    }),
  );
}

export async function hydrateCafeLogImageRatios(log: CafeLog): Promise<CafeLog> {
  const photos = parseStringArray(log.photos);
  const notePhotos = parseStringArray(log.note_photos);
  let photoRatios = parseAspectRatios(log.photo_aspect_ratios);
  let notePhotoRatios = parseAspectRatios(log.note_photo_aspect_ratios);

  const needsPhotoRatios = photos.length > 0 && photoRatios.length !== photos.length;
  const needsNotePhotoRatios =
    notePhotos.length > 0 && notePhotoRatios.length !== notePhotos.length;
  if (!needsPhotoRatios && !needsNotePhotoRatios) return log;

  if (needsPhotoRatios) photoRatios = await measureImageAspectRatios(photos);
  if (needsNotePhotoRatios) notePhotoRatios = await measureImageAspectRatios(notePhotos);

  const photoAspectRatios = photos.length > 0 ? JSON.stringify(photoRatios) : undefined;
  const notePhotoAspectRatios = notePhotos.length > 0 ? JSON.stringify(notePhotoRatios) : undefined;
  if (log.id != null) {
    try {
      await updateCafeLogImageRatios(log.id, photoAspectRatios, notePhotoAspectRatios);
    } catch (error) {
      console.warn('Failed to persist image aspect ratios:', error);
    }
  }
  return {
    ...log,
    photo_aspect_ratios: photoAspectRatios,
    note_photo_aspect_ratios: notePhotoAspectRatios,
  };
}

export async function hydrateCafeLogsImageRatios(logs: CafeLog[]): Promise<CafeLog[]> {
  return Promise.all(logs.map(hydrateCafeLogImageRatios));
}
