import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, DB_VERSION } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('coffee-note-v5.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = versionRow?.user_version ?? 0;

  if (version < DB_VERSION) {
    if (version === 3) {
      await db.execAsync(`ALTER TABLE cafe_logs ADD COLUMN is_favorite INTEGER DEFAULT 0;`);
    } else {
      await db.execAsync(`
        DROP TABLE IF EXISTS cafe_tasting_notes;
        DROP TABLE IF EXISTS cafe_menu_items;
        DROP TABLE IF EXISTS cafe_logs;
      `);
      await db.execAsync(CREATE_TABLES_SQL);
    }
    await db.execAsync(`PRAGMA user_version = ${DB_VERSION};`);
  }

  return db;
}
