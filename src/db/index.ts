import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, DB_VERSION } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync('coffee-note-v5.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = versionRow?.user_version ?? 0;

  if (version !== DB_VERSION) {
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
    await db.execAsync(`PRAGMA user_version = ${DB_VERSION};`);
  }

  // DB 버전을 올리면 기존 데이터를 초기화하는 앱의 레거시 정책과 분리해,
  // 이미지 메타데이터 컬럼은 기존 기록을 보존하는 additive migration으로 추가한다.
  const cafeLogColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(cafe_logs)');
  const cafeLogColumnNames = new Set(cafeLogColumns.map((column) => column.name));
  if (!cafeLogColumnNames.has('photo_aspect_ratios')) {
    await db.execAsync('ALTER TABLE cafe_logs ADD COLUMN photo_aspect_ratios TEXT;');
  }
  if (!cafeLogColumnNames.has('note_photo_aspect_ratios')) {
    await db.execAsync('ALTER TABLE cafe_logs ADD COLUMN note_photo_aspect_ratios TEXT;');
  }

  return db;
}
