import { getDB } from '@/src/db';

export const AI_CONSENT_VERSION = '2026-08-19';
const AI_CONSENT_KEY = 'ai_analysis_consent_version';

async function ensurePreferencesTable() {
  const db = await getDB();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_preferences (
      key        TEXT PRIMARY KEY NOT NULL,
      value      TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export async function hasCurrentAiConsent(): Promise<boolean> {
  const db = await ensurePreferencesTable();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_preferences WHERE key = ?',
    AI_CONSENT_KEY,
  );
  return row?.value === AI_CONSENT_VERSION;
}

export async function grantAiConsent(): Promise<void> {
  const db = await ensurePreferencesTable();
  await db.runAsync(
    `INSERT INTO app_preferences (key, value, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    AI_CONSENT_KEY,
    AI_CONSENT_VERSION,
  );
}

export async function revokeAiConsent(): Promise<void> {
  const db = await ensurePreferencesTable();
  await db.runAsync('DELETE FROM app_preferences WHERE key = ?', AI_CONSENT_KEY);
}
