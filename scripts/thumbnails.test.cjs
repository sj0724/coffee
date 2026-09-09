const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function setup() {
  const files = new Map();
  let generated = 0;
  const sizes = [];
  const path = (...parts) => parts.map((part) => typeof part === 'string' ? part : part.uri).join('/');
  class File {
    constructor(...parts) { this.uri = path(...parts); }
    get exists() { return files.has(this.uri); }
    get size() { return files.get(this.uri)?.size ?? 0; }
    get modificationTime() { return files.get(this.uri)?.time ?? 0; }
    get extension() { return '.jpg'; }
    delete() { files.delete(this.uri); }
    move(target) { files.set(target.uri, files.get(this.uri)); this.delete(); this.uri = target.uri; }
    copy(target) { if (!this.exists) throw Error('missing'); files.set(target.uri, { ...files.get(this.uri) }); }
  }
  class Directory {
    constructor(...parts) { this.uri = path(...parts); }
    create() {}
    list() { return [...files.keys()].filter((uri) => uri.startsWith(this.uri + '/')).map((uri) => new File(uri)); }
  }
  const dependencies = {
    'expo-file-system': { File, Directory, Paths: { cache: 'cache', document: 'documents' } },
    'expo-image': { Image: { loadAsync: async (uri) => { if (uri === 'missing') throw Error('missing'); return { width: 4000, height: 3000, release() {} }; } } },
    'expo-image-manipulator': { SaveFormat: { JPEG: 'jpeg' }, ImageManipulator: { manipulate: () => ({
      resize(size) { sizes.push(size); }, release() {}, renderAsync: async () => ({ release() {}, saveAsync: async (options) => {
        assert.equal(options.compress, 0.78);
        const uri = `temporary/${++generated}.jpg`;
        files.set(uri, { size: 100000, time: 100 });
        return { uri };
      } }),
    }) } },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/services/cafePhotos.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'exports', code)((id) => dependencies[id], exports);
  return { ...exports, files, sizes, generated: () => generated };
}
test('coalesces generation, reuses cache, and regenerates after cache eviction', async () => {
  const api = setup();
  const [a, b] = await Promise.all([api.getThumbnail('original'), api.getThumbnail('original')]);
  assert.equal(a, b);
  assert.equal(api.generated(), 1);
  assert.deepEqual(api.sizes, [{ width: 800 }]);
  assert.equal(await api.getThumbnail('original'), a);
  assert.equal(api.generated(), 1);
  api.files.delete(a);
  await api.getThumbnail('original');
  assert.equal(api.generated(), 2);
});
test('prunes old thumbnails at 100MB without touching originals; errors allow next job', async () => {
  const api = setup();
  api.files.set('cache/cafe-thumbnails-v1/old.jpg', { size: 100 * 1024 * 1024, time: 1 });
  api.files.set('documents/original.jpg', { size: 2000000, time: 1 });
  assert.equal(await api.getThumbnail('missing'), undefined);
  const uri = await api.getThumbnail('original');
  assert.ok(api.files.has(uri));
  assert.ok(!api.files.has('cache/cafe-thumbnails-v1/old.jpg'));
  assert.ok(api.files.has('documents/original.jpg'));
});
test('preserves original bytes in documents and returns reusable URIs', () => {
  const api = setup();
  api.files.set('picker/photo.jpg', { size: 4000000, time: 1 });
  const json = api.persistPhotoUris('["picker/photo.jpg"]');
  const [uri] = JSON.parse(json);
  assert.ok(uri.startsWith('documents/cafe-originals/'));
  assert.equal(api.files.get(uri).size, 4000000);
  assert.equal(api.persistPhotoUris(json), json);
});
