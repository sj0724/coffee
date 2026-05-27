import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, DB_VERSION } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('coffee-note-v5.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = versionRow?.user_version ?? 0;

  if (version < DB_VERSION) {
    if (
      version !== 3 &&
      version !== 5 &&
      version !== 6 &&
      version !== 7 &&
      version !== 8 &&
      version !== 9
    ) {
      await db.execAsync(`
        DROP TABLE IF EXISTS cafe_tasting_note_beans;
        DROP TABLE IF EXISTS espresso_notes;
        DROP TABLE IF EXISTS cafe_tasting_notes;
        DROP TABLE IF EXISTS cafe_menu_items;
        DROP TABLE IF EXISTS cafe_logs;
        DROP TABLE IF EXISTS recipe_steps;
        DROP TABLE IF EXISTS recipes;
        DROP TABLE IF EXISTS brew_logs;
      `);
      await db.execAsync(CREATE_TABLES_SQL);
    } else {
      if (version === 3) {
        await db.execAsync(`ALTER TABLE cafe_logs ADD COLUMN is_favorite INTEGER DEFAULT 0;`);
        await db.execAsync(`ALTER TABLE cafe_logs ADD COLUMN address TEXT;`);
        version = 6;
      }
      if (version === 5) {
        await db.execAsync(`ALTER TABLE cafe_logs ADD COLUMN address TEXT;`);
        version = 6;
      }
      if (version === 6) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS espresso_notes (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            cafe_menu_item_id INTEGER NOT NULL REFERENCES cafe_menu_items(id) ON DELETE CASCADE,
            tags              TEXT NOT NULL DEFAULT '[]'
          );
        `);
        version = 7;
      }
      if (version === 7) {
        try {
          await db.execAsync(
            `ALTER TABLE cafe_tasting_notes ADD COLUMN is_blend INTEGER DEFAULT 0;`,
          );
        } catch {
          // column already exists
        }
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS cafe_tasting_note_beans (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id INTEGER NOT NULL REFERENCES cafe_tasting_notes(id) ON DELETE CASCADE,
            origin  TEXT,
            variety TEXT,
            process TEXT,
            ratio   INTEGER
          );
        `);
        version = 8;
      }
      if (version === 8) {
        // v6→8 직행으로 cafe_tasting_note_beans 누락된 기기 보정
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS cafe_tasting_note_beans (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id INTEGER NOT NULL REFERENCES cafe_tasting_notes(id) ON DELETE CASCADE,
            origin  TEXT,
            variety TEXT,
            process TEXT,
            ratio   INTEGER
          );
        `);
        version = 9;
      }
      if (version === 9) {
        // is_blend가 없는 구버전 DB 보정
        try {
          await db.execAsync(
            `ALTER TABLE cafe_tasting_notes ADD COLUMN is_blend INTEGER DEFAULT 0;`,
          );
        } catch {
          // column already exists
        }
      }
    }

    await db.execAsync(`PRAGMA user_version = ${DB_VERSION};`);
  }

  return db;
}
