import { getDB } from '../index';
import { EspressoNote } from '../../types';

export async function getEspressoNote(cafeMenuItemId: number): Promise<EspressoNote | null> {
  try {
    const db = await getDB();
    const row = await db.getFirstAsync<{ id: number; cafe_menu_item_id: number; tags: string }>(
      'SELECT * FROM espresso_notes WHERE cafe_menu_item_id = ?',
      [cafeMenuItemId],
    );
    if (!row) return null;
    return { ...row, tags: JSON.parse(row.tags) };
  } catch (e) {
    console.error('getEspressoNote error:', e);
    return null;
  }
}

export async function upsertEspressoNote(note: EspressoNote): Promise<boolean> {
  try {
    const db = await getDB();
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM espresso_notes WHERE cafe_menu_item_id = ?',
      [note.cafe_menu_item_id],
    );
    const tags = JSON.stringify(note.tags);
    if (existing) {
      await db.runAsync(
        'UPDATE espresso_notes SET tags = ? WHERE cafe_menu_item_id = ?',
        [tags, note.cafe_menu_item_id],
      );
    } else {
      await db.runAsync(
        'INSERT INTO espresso_notes (cafe_menu_item_id, tags) VALUES (?, ?)',
        [note.cafe_menu_item_id, tags],
      );
    }
    return true;
  } catch (e) {
    console.error('upsertEspressoNote error:', e);
    return false;
  }
}
