import { getDB } from '../index';
import { CafeMenuItem } from '../../types';

export async function getMenuItems(cafeLogId: number): Promise<CafeMenuItem[]> {
  try {
    const db = await getDB();
    return await db.getAllAsync<CafeMenuItem>(
      'SELECT * FROM cafe_menu_items WHERE cafe_log_id = ? ORDER BY created_at ASC',
      [cafeLogId],
    );
  } catch (e) {
    console.error('getMenuItems error:', e);
    return [];
  }
}

export async function getMenuItem(id: number): Promise<CafeMenuItem | null> {
  try {
    const db = await getDB();
    return await db.getFirstAsync<CafeMenuItem>('SELECT * FROM cafe_menu_items WHERE id = ?', [id]);
  } catch (e) {
    console.error('getMenuItem error:', e);
    return null;
  }
}

export async function createMenuItem(
  item: Omit<CafeMenuItem, 'id' | 'created_at'>,
): Promise<number | null> {
  try {
    const db = await getDB();
    const result = await db.runAsync(
      'INSERT INTO cafe_menu_items (cafe_log_id, menu_name, is_coffee) VALUES (?, ?, ?)',
      [item.cafe_log_id, item.menu_name, item.is_coffee ?? null],
    );
    return result.lastInsertRowId;
  } catch (e) {
    console.error('createMenuItem error:', e);
    return null;
  }
}

export async function deleteMenuItem(id: number): Promise<boolean> {
  try {
    const db = await getDB();
    await db.runAsync('DELETE FROM cafe_menu_items WHERE id = ?', [id]);
    return true;
  } catch (e) {
    console.error('deleteMenuItem error:', e);
    return false;
  }
}
