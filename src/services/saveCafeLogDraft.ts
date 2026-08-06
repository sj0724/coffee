import { createCafeLog } from '@/src/db/queries/cafeLogs';
import { createMenuItem } from '@/src/db/queries/cafeMenuItems';
import { upsertTastingNote } from '@/src/db/queries/tastingNotes';
import type { CafeLogDraft } from '@/src/store/cafeLogDraftStore';

export const saveCafeLogDraft = async (draft: CafeLogDraft): Promise<number | null> => {
  if (!draft.selectedPlace) return null;

  const photos = [draft.menuPhoto, ...draft.cafePhotos].filter(Boolean) as string[];
  const logId = await createCafeLog({
    cafe_name: draft.selectedPlace.name,
    visited_at: draft.visitedAt,
    photos: photos.length > 0 ? JSON.stringify(photos) : undefined,
    note_photos: draft.notePhotos.length > 0 ? JSON.stringify(draft.notePhotos) : undefined,
    address: draft.selectedPlace.address || undefined,
    memo: draft.memo.trim() || undefined,
  });
  if (logId == null) return null;

  const hasCoffeeInfo = Boolean(
    draft.origin ||
    draft.farm ||
    draft.variety ||
    draft.process ||
    draft.roastLevel ||
    draft.officialNotes.length > 0 ||
    draft.myNotes.length > 0 ||
    draft.acidity != null ||
    (draft.isBlend && draft.beans.length > 0),
  );

  if (!draft.menuName.trim() && !hasCoffeeInfo) return logId;

  const menuId = await createMenuItem({
    cafe_log_id: logId,
    menu_name: draft.menuName.trim() || (draft.photoMode === 'handdip' ? '핸드드립' : '커피'),
    is_coffee: draft.photoMode === 'menu' ? (draft.isCoffeeDrink ? 1 : 0) : null,
  });
  if (menuId == null || !hasCoffeeInfo) return logId;

  await upsertTastingNote({
    cafe_menu_item_id: menuId,
    is_blend: draft.isBlend,
    origin: draft.isBlend ? undefined : draft.origin || undefined,
    farm: draft.isBlend ? undefined : draft.farm || undefined,
    variety: draft.isBlend ? undefined : draft.variety || undefined,
    process: draft.isBlend ? undefined : draft.process || undefined,
    roast_level: draft.roastLevel || undefined,
    official_notes: draft.officialNotes,
    my_notes: draft.myNotes,
    acidity: draft.acidity,
    nuttiness: draft.nuttiness,
    richness: draft.richness,
    smoothness: draft.smoothness,
    beans: draft.isBlend ? draft.beans : [],
  });

  return logId;
};
