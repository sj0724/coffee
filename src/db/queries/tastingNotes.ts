import { getDB } from '../index';
import { CafeTastingNote } from '../../types';

type RawNote = Omit<CafeTastingNote, 'official_notes' | 'my_notes'> & {
  official_notes: string | null;
  my_notes: string | null;
};

function parseNote(raw: RawNote): CafeTastingNote {
  return {
    ...raw,
    official_notes: raw.official_notes ? JSON.parse(raw.official_notes) : [],
    my_notes: raw.my_notes ? JSON.parse(raw.my_notes) : [],
  };
}

export async function getTastingNote(cafeMenuItemId: number): Promise<CafeTastingNote | null> {
  try {
    const db = await getDB();
    const raw = await db.getFirstAsync<RawNote>(
      'SELECT * FROM cafe_tasting_notes WHERE cafe_menu_item_id = ?',
      [cafeMenuItemId],
    );
    return raw ? parseNote(raw) : null;
  } catch (e) {
    console.error('getTastingNote error:', e);
    return null;
  }
}

export async function upsertTastingNote(note: CafeTastingNote): Promise<boolean> {
  try {
    const db = await getDB();
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM cafe_tasting_notes WHERE cafe_menu_item_id = ?',
      [note.cafe_menu_item_id],
    );

    const officialNotes = JSON.stringify(note.official_notes ?? []);
    const myNotes = JSON.stringify(note.my_notes ?? []);

    if (existing) {
      await db.runAsync(
        `UPDATE cafe_tasting_notes
         SET origin = ?, variety = ?, process = ?, roast_level = ?,
             official_notes = ?, my_notes = ?, temperature = ?,
             acidity = ?, nuttiness = ?, richness = ?, smoothness = ?
         WHERE cafe_menu_item_id = ?`,
        [
          note.origin ?? null,
          note.variety ?? null,
          note.process ?? null,
          note.roast_level ?? null,
          officialNotes,
          myNotes,
          note.temperature ?? null,
          note.acidity ?? null,
          note.nuttiness ?? null,
          note.richness ?? null,
          note.smoothness ?? null,
          note.cafe_menu_item_id,
        ],
      );
    } else {
      await db.runAsync(
        `INSERT INTO cafe_tasting_notes
         (cafe_menu_item_id, origin, variety, process, roast_level,
          official_notes, my_notes, temperature, acidity, nuttiness, richness, smoothness)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          note.cafe_menu_item_id,
          note.origin ?? null,
          note.variety ?? null,
          note.process ?? null,
          note.roast_level ?? null,
          officialNotes,
          myNotes,
          note.temperature ?? null,
          note.acidity ?? null,
          note.nuttiness ?? null,
          note.richness ?? null,
          note.smoothness ?? null,
        ],
      );
    }
    return true;
  } catch (e) {
    console.error('upsertTastingNote error:', e);
    return false;
  }
}
