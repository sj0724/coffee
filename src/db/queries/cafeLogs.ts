import { getDB } from '../index';
import { CafeLog } from '../../types';

export async function getCafeLogs(): Promise<CafeLog[]> {
  try {
    const db = await getDB();
    return await db.getAllAsync<CafeLog>('SELECT * FROM cafe_logs ORDER BY visited_at DESC');
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
    const result = await db.runAsync(
      `INSERT INTO cafe_logs (cafe_name, visited_at, photo_uri, memo) VALUES (?, ?, ?, ?)`,
      [log.cafe_name, log.visited_at, log.photo_uri ?? null, log.memo ?? null],
    );
    return result.lastInsertRowId;
  } catch (e) {
    console.error('createCafeLog error:', e);
    return null;
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
