import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { getMenuItem } from '@/src/db/queries/cafeMenuItems';
import { getTastingNote, upsertTastingNote } from '@/src/db/queries/tastingNotes';
import { getEspressoNote, upsertEspressoNote } from '@/src/db/queries/espressoNotes';
import { NoteForm } from '@/src/components/cafe/NoteForm';
import { EspressoNoteForm } from '@/src/components/cafe/EspressoNoteForm';
import { getMenuCategory } from '@/src/components/cafe/menuCategory';
import type { CafeMenuItem, HanddripNote, MenuCategory } from '@/src/types';

export default function EditCafeMenuScreen() {
  const { menuId } = useLocalSearchParams<{ menuId: string }>();
  const router = useRouter();
  const id = Number(menuId);
  const [item, setItem] = useState<CafeMenuItem | null>(null);
  const [category, setCategory] = useState<MenuCategory | null>(null);
  const [handdripForm, setHanddripForm] = useState<Partial<HanddripNote>>({});
  const [espressoTags, setEspressoTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const menuItem = await getMenuItem(id);
      if (!menuItem) {
        setLoading(false);
        return;
      }

      let menuCategory = getMenuCategory(menuItem.menu_name, menuItem.is_coffee);
      setItem(menuItem);

      if (menuCategory === 'handdip') {
        const note = await getTastingNote(id);
        setHanddripForm(note ? { ...note } : {});
      } else if (menuCategory === 'espresso') {
        const note = await getEspressoNote(id);
        setEspressoTags(note?.tags ?? []);
      } else if (menuItem.is_coffee == null) {
        const note = await getTastingNote(id);
        if (note) {
          menuCategory = 'handdip';
          setHanddripForm({ ...note });
        }
      }
      setCategory(menuCategory);
      setLoading(false);
    }

    load();
  }, [id]);

  async function save() {
    if (!category || saving) return;
    setSaving(true);
    const success =
      category === 'handdip'
        ? await upsertTastingNote({
            ...handdripForm,
            cafe_menu_item_id: id,
          } as HanddripNote)
        : await upsertEspressoNote({ cafe_menu_item_id: id, tags: espressoTags });
    setSaving(false);

    if (success) router.back();
    else Alert.alert('오류', '저장에 실패했어요. 다시 시도해주세요.');
  }

  return (
    <>
      <Stack.Screen options={{ title: item?.menu_name ?? '메뉴 수정' }} />
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator color="#101114" className="mt-10" />
        ) : !item || !category || category === 'simple' || category === 'dessert' ? (
          <View className="items-center py-10">
            <Text className="text-coffee-warm">수정할 수 있는 메뉴 정보가 없어요.</Text>
          </View>
        ) : category === 'handdip' ? (
          <NoteForm form={handdripForm} onChange={setHanddripForm} onSave={save} />
        ) : (
          <EspressoNoteForm tags={espressoTags} onChange={setEspressoTags} onSave={save} />
        )}
        {saving && <ActivityIndicator color="#101114" className="mt-4" />}
      </ScrollView>
    </>
  );
}
