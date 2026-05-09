import { getDB } from '../index';
import { BrewLog } from '../../types';

type RawBrewLog = Omit<BrewLog, 'my_notes'> & { my_notes: string | null };

function parseBrewLog(raw: RawBrewLog): BrewLog {
  return {
    ...raw,
    my_notes: raw.my_notes ? JSON.parse(raw.my_notes) : [],
  };
}

export async function getBrewLogs(recipeId?: number): Promise<BrewLog[]> {
  try {
    const db = await getDB();
    const raws =
      recipeId != null
        ? await db.getAllAsync<RawBrewLog>(
            'SELECT * FROM brew_logs WHERE recipe_id = ? ORDER BY brewed_at DESC',
            [recipeId],
          )
        : await db.getAllAsync<RawBrewLog>('SELECT * FROM brew_logs ORDER BY brewed_at DESC');
    return raws.map(parseBrewLog);
  } catch (e) {
    console.error('getBrewLogs error:', e);
    return [];
  }
}

export async function getBrewLog(id: number): Promise<BrewLog | null> {
  try {
    const db = await getDB();
    const raw = await db.getFirstAsync<RawBrewLog>('SELECT * FROM brew_logs WHERE id = ?', [id]);
    return raw ? parseBrewLog(raw) : null;
  } catch (e) {
    console.error('getBrewLog error:', e);
    return null;
  }
}

export async function createBrewLog(
  log: Omit<BrewLog, 'id' | 'created_at'>,
): Promise<number | null> {
  try {
    const db = await getDB();
    const result = await db.runAsync(
      `INSERT INTO brew_logs (recipe_id, brewed_at, rating, my_notes, memo)
       VALUES (?, ?, ?, ?, ?)`,
      [
        log.recipe_id ?? null,
        log.brewed_at,
        log.rating ?? null,
        JSON.stringify(log.my_notes ?? []),
        log.memo ?? null,
      ],
    );
    return result.lastInsertRowId;
  } catch (e) {
    console.error('createBrewLog error:', e);
    return null;
  }
}

export async function deleteBrewLog(id: number): Promise<boolean> {
  try {
    const db = await getDB();
    await db.runAsync('DELETE FROM brew_logs WHERE id = ?', [id]);
    return true;
  } catch (e) {
    console.error('deleteBrewLog error:', e);
    return false;
  }
}
