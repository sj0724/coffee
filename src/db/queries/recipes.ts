import { getDB } from '../index';
import { Recipe } from '../../types';

export async function getRecipes(): Promise<Recipe[]> {
  try {
    const db = await getDB();
    return await db.getAllAsync<Recipe>(
      'SELECT * FROM recipes ORDER BY is_favorite DESC, created_at DESC',
    );
  } catch (e) {
    console.error('getRecipes error:', e);
    return [];
  }
}

export async function getRecipe(id: number): Promise<Recipe | null> {
  try {
    const db = await getDB();
    return await db.getFirstAsync<Recipe>('SELECT * FROM recipes WHERE id = ?', [id]);
  } catch (e) {
    console.error('getRecipe error:', e);
    return null;
  }
}

export async function createRecipe(
  recipe: Omit<Recipe, 'id' | 'created_at'>,
): Promise<number | null> {
  try {
    const db = await getDB();
    const result = await db.runAsync(
      `INSERT INTO recipes (name, brew_method, bean_name, bean_amount, water_amount, water_temp, grind_size, memo, is_favorite)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recipe.name,
        recipe.brew_method,
        recipe.bean_name ?? null,
        recipe.bean_amount ?? null,
        recipe.water_amount ?? null,
        recipe.water_temp ?? null,
        recipe.grind_size ?? null,
        recipe.memo ?? null,
        recipe.is_favorite ?? 0,
      ],
    );
    return result.lastInsertRowId;
  } catch (e) {
    console.error('createRecipe error:', e);
    return null;
  }
}

export async function updateRecipe(id: number, recipe: Partial<Recipe>): Promise<boolean> {
  try {
    const db = await getDB();
    await db.runAsync(
      `UPDATE recipes SET name = ?, brew_method = ?, bean_name = ?, bean_amount = ?,
       water_amount = ?, water_temp = ?, grind_size = ?, memo = ?, is_favorite = ?
       WHERE id = ?`,
      [
        recipe.name ?? '',
        recipe.brew_method ?? '',
        recipe.bean_name ?? null,
        recipe.bean_amount ?? null,
        recipe.water_amount ?? null,
        recipe.water_temp ?? null,
        recipe.grind_size ?? null,
        recipe.memo ?? null,
        recipe.is_favorite ?? 0,
        id,
      ],
    );
    return true;
  } catch (e) {
    console.error('updateRecipe error:', e);
    return false;
  }
}

export async function toggleFavorite(id: number, isFavorite: boolean): Promise<boolean> {
  try {
    const db = await getDB();
    await db.runAsync('UPDATE recipes SET is_favorite = ? WHERE id = ?', [isFavorite ? 1 : 0, id]);
    return true;
  } catch (e) {
    console.error('toggleFavorite error:', e);
    return false;
  }
}

export async function deleteRecipe(id: number): Promise<boolean> {
  try {
    const db = await getDB();
    await db.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
    return true;
  } catch (e) {
    console.error('deleteRecipe error:', e);
    return false;
  }
}
