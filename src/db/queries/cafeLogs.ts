import { persistPhotoUris, getThumbnail } from '@/src/services/cafePhotos';
import { getDB } from '../index';
import { CafeLog } from '../../types';

export async function getCafeLogs(): Promise<CafeLog[]> {
  try {
    const db = await getDB();
    return await db.getAllAsync<CafeLog>(
      `SELECT cafe_logs.*,
         COUNT(DISTINCT cafe_menu_items.id) AS menu_count,
         (SELECT ctn.my_notes
          FROM cafe_menu_items cmi
          JOIN cafe_tasting_notes ctn ON ctn.cafe_menu_item_id = cmi.id
          WHERE cmi.cafe_log_id = cafe_logs.id
          ORDER BY cmi.id ASC
          LIMIT 1) AS first_my_notes,
         (SELECT GROUP_CONCAT(ctn2.my_notes, '||')
          FROM cafe_menu_items cmi2
          JOIN cafe_tasting_notes ctn2 ON ctn2.cafe_menu_item_id = cmi2.id
          WHERE cmi2.cafe_log_id = cafe_logs.id
          AND ctn2.my_notes IS NOT NULL) AS all_my_notes_concat
       FROM cafe_logs
       LEFT JOIN cafe_menu_items ON cafe_menu_items.cafe_log_id = cafe_logs.id
       GROUP BY cafe_logs.id
       ORDER BY cafe_logs.visited_at DESC`,
    );
  } catch (e) {
    console.error('getCafeLogs error:', e);
    return [];
  }
}

export async function getCafeLog(id: number): Promise<CafeLog | null> {
  try {
    const db = await getDB();
    return await db.getFirstAsync<CafeLog>('SELECT * FROM cafe_logs WHERE id = ?', [id]);
  } catch (e) {
    console.error('getCafeLog error:', e);
    return null;
  }
}

export async function createCafeLog(
  log: Omit<CafeLog, 'id' | 'created_at'>,
): Promise<number | null> {
  try {
    const db = await getDB();
    const photos = persistPhotoUris(log.photos);
    const notePhotos = persistPhotoUris(log.note_photos);
    const representative =
      (photos ? JSON.parse(photos)[0] : undefined) ??
      (notePhotos ? JSON.parse(notePhotos)[0] : undefined);
    const result = await db.runAsync(
      `INSERT INTO cafe_logs (
        cafe_name, visited_at, photos, photo_aspect_ratios,
        note_photos, note_photo_aspect_ratios, address, memo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.cafe_name,
        log.visited_at,
        photos ?? null,
        log.photo_aspect_ratios ?? null,
        notePhotos ?? null,
        log.note_photo_aspect_ratios ?? null,
        log.address ?? null,
        log.memo ?? null,
      ],
    );
    if (representative) void getThumbnail(representative);
    return result.lastInsertRowId;
  } catch (e) {
    console.error('createCafeLog error:', e);
    return null;
  }
}

export async function updateCafeLogImageRatios(
  id: number,
  photoAspectRatios?: string,
  notePhotoAspectRatios?: string,
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE cafe_logs
     SET photo_aspect_ratios = ?, note_photo_aspect_ratios = ?
     WHERE id = ?`,
    [photoAspectRatios ?? null, notePhotoAspectRatios ?? null, id],
  );
}

export async function setFavorite(id: number, value: 0 | 1): Promise<boolean> {
  try {
    const db = await getDB();
    await db.runAsync('UPDATE cafe_logs SET is_favorite = ? WHERE id = ?', [value, id]);
    return true;
  } catch (e) {
    console.error('setFavorite error:', e);
    return false;
  }
}

export async function deleteCafeLog(id: number): Promise<boolean> {
  try {
    const db = await getDB();
    await db.runAsync('DELETE FROM cafe_logs WHERE id = ?', [id]);
    return true;
  } catch (e) {
    console.error('deleteCafeLog error:', e);
    return false;
  }
}

export async function updateCafeLogMemo(id: number, memo: string): Promise<boolean> {
  try {
    const db = await getDB();
    const result = await db.runAsync('UPDATE cafe_logs SET memo = ? WHERE id = ?', [
      memo.trim() || null,
      id,
    ]);
    return result.changes > 0;
  } catch (error) {
    console.error('updateCafeLogMemo error:', error);
    return false;
  }
}
