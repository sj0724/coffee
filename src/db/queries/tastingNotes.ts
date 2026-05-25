import { getDB } from '../index';
import { HanddripNote, HanddripNoteBean } from '../../types';

type RawNote = Omit<HanddripNote, 'official_notes' | 'my_notes' | 'beans'> & {
  official_notes: string | null;
  my_notes: string | null;
};

function parseNote(raw: RawNote, beans: HanddripNoteBean[]): HanddripNote {
  return {
    ...raw,
    official_notes: raw.official_notes ? JSON.parse(raw.official_notes) : [],
    my_notes: raw.my_notes ? JSON.parse(raw.my_notes) : [],
    beans,
  };
}

export async function getTastingNote(cafeMenuItemId: number): Promise<HanddripNote | null> {
  try {
    const db = await getDB();
    const raw = await db.getFirstAsync<RawNote>(
      'SELECT * FROM cafe_tasting_notes WHERE cafe_menu_item_id = ?',
      [cafeMenuItemId],
    );
    if (!raw) return null;

    const beans = raw.id
      ? await db.getAllAsync<HanddripNoteBean>(
          'SELECT * FROM cafe_tasting_note_beans WHERE note_id = ?',
          [raw.id],
        )
      : [];

    return parseNote(raw, beans);
  } catch (e) {
    console.error('getTastingNote error:', e);
    return null;
  }
}

export async function upsertTastingNote(note: HanddripNote): Promise<boolean> {
  try {
    const db = await getDB();

    await db.withTransactionAsync(async () => {
      const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM cafe_tasting_notes WHERE cafe_menu_item_id = ?',
        [note.cafe_menu_item_id],
      );

      const officialNotes = JSON.stringify(note.official_notes ?? []);
      const myNotes = JSON.stringify(note.my_notes ?? []);
      const isBlend = note.is_blend ?? 0;

      let noteId: number;

      if (existing) {
        noteId = existing.id;
        await db.runAsync(
          `UPDATE cafe_tasting_notes
           SET is_blend = ?, origin = ?, variety = ?, process = ?, roast_level = ?,
               official_notes = ?, my_notes = ?,
               acidity = ?, nuttiness = ?, richness = ?, smoothness = ?
           WHERE cafe_menu_item_id = ?`,
          [
            isBlend,
            isBlend ? null : (note.origin ?? null),
            isBlend ? null : (note.variety ?? null),
            isBlend ? null : (note.process ?? null),
            note.roast_level ?? null,
            officialNotes,
            myNotes,
            note.acidity ?? null,
            note.nuttiness ?? null,
            note.richness ?? null,
            note.smoothness ?? null,
            note.cafe_menu_item_id,
          ],
        );
      } else {
        const result = await db.runAsync(
          `INSERT INTO cafe_tasting_notes
           (cafe_menu_item_id, is_blend, origin, variety, process, roast_level,
            official_notes, my_notes, acidity, nuttiness, richness, smoothness)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            note.cafe_menu_item_id,
            isBlend,
            isBlend ? null : (note.origin ?? null),
            isBlend ? null : (note.variety ?? null),
            isBlend ? null : (note.process ?? null),
            note.roast_level ?? null,
            officialNotes,
            myNotes,
            note.acidity ?? null,
            note.nuttiness ?? null,
            note.richness ?? null,
            note.smoothness ?? null,
          ],
        );
        noteId = result.lastInsertRowId;
      }

      await db.runAsync('DELETE FROM cafe_tasting_note_beans WHERE note_id = ?', [noteId]);

      if (isBlend && note.beans?.length) {
        for (const bean of note.beans) {
          await db.runAsync(
            'INSERT INTO cafe_tasting_note_beans (note_id, origin, variety, process, ratio) VALUES (?, ?, ?, ?, ?)',
            [noteId, bean.origin ?? null, bean.variety ?? null, bean.process ?? null, bean.ratio ?? null],
          );
        }
      }
    });

    return true;
  } catch (e) {
    console.error('upsertTastingNote error:', e);
    return false;
  }
}
