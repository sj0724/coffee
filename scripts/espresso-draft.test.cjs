const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

test('creation saves espresso features without handdrip information and excludes non-coffee menus', async () => {
  for (const menuType of ['coffee', 'dessert', 'beverage']) {
    const saved = [];
    const dependencies = {
      '@/src/db/queries/cafeLogs': { createCafeLog: async () => 1 },
      '@/src/db/queries/cafeMenuItems': { createMenuItem: async () => 2 },
      '@/src/db/queries/tastingNotes': { upsertTastingNote: async () => { throw new Error('Unexpected handdrip note'); } },
      '@/src/db/queries/espressoNotes': { upsertEspressoNote: async (note) => { saved.push(note); return true; } },
      '@/src/services/imageAspectRatios': { measureImageAspectRatios: async () => [] },
    };
    const exports = {};
    const code = ts.transpileModule(fs.readFileSync('src/services/saveCafeLogDraft.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    new Function('require', 'exports', code)((id) => dependencies[id], exports);
    const id = await exports.saveCafeLogDraft({
      selectedPlace: { name: 'Cafe', address: '' }, cafePhotos: [], notePhotos: [],
      memo: '', menuName: menuType === 'coffee' ? '' : 'Menu', photoMode: 'menu', menuType,
      officialNotes: [], myNotes: [], beans: [], espressoTags: ['진함', '고소함'],
    });
    assert.equal(id, 1);
    assert.deepEqual(saved, menuType === 'coffee' ? [{ cafe_menu_item_id: 2, tags: ['진함', '고소함'] }] : []);
  }
});
