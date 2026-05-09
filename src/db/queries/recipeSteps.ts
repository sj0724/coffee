import { getDB } from '../index';
import { RecipeStep } from '../../types';

export async function getRecipeSteps(recipeId: number): Promise<RecipeStep[]> {
  try {
    const db = await getDB();
    return await db.getAllAsync<RecipeStep>(
      'SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY step_order ASC',
      [recipeId],
    );
  } catch (e) {
    console.error('getRecipeSteps error:', e);
    return [];
  }
}

export async function createRecipeStep(step: Omit<RecipeStep, 'id'>): Promise<number | null> {
  try {
    const db = await getDB();
    const result = await db.runAsync(
      `INSERT INTO recipe_steps (recipe_id, step_order, title, description, duration)
       VALUES (?, ?, ?, ?, ?)`,
      [
        step.recipe_id,
        step.step_order,
        step.title,
        step.description ?? null,
        step.duration ?? null,
      ],
    );
    return result.lastInsertRowId;
  } catch (e) {
    console.error('createRecipeStep error:', e);
    return null;
  }
}

export async function replaceRecipeSteps(
  recipeId: number,
  steps: Omit<RecipeStep, 'id'>[],
): Promise<boolean> {
  try {
    const db = await getDB();
    await db.runAsync('DELETE FROM recipe_steps WHERE recipe_id = ?', [recipeId]);
    for (const step of steps) {
      await db.runAsync(
        `INSERT INTO recipe_steps (recipe_id, step_order, title, description, duration)
         VALUES (?, ?, ?, ?, ?)`,
        [recipeId, step.step_order, step.title, step.description ?? null, step.duration ?? null],
      );
    }
    return true;
  } catch (e) {
    console.error('replaceRecipeSteps error:', e);
    return false;
  }
}

export async function deleteRecipeStep(id: number): Promise<boolean> {
  try {
    const db = await getDB();
    await db.runAsync('DELETE FROM recipe_steps WHERE id = ?', [id]);
    return true;
  } catch (e) {
    console.error('deleteRecipeStep error:', e);
    return false;
  }
}
