const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, dependencies, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('require', 'exports', ...Object.keys(globals), code)(
    (id) => dependencies[id],
    exports,
    ...Object.values(globals),
  );
  return exports;
}
function service(fetcher) {
  const sizes = [];
  const api = load(
    'src/services/visionLLM.ts',
    {
      'expo-image': { Image: { loadAsync: async (uri) => ({ width: 4000, height: 3000, uri }) } },
      'expo-image-manipulator': {
        SaveFormat: { JPEG: 'jpeg' },
        ImageManipulator: {
          manipulate: (source) => ({
            resize: (size) => sizes.push(size),
            renderAsync: async () => ({
              saveAsync: async () => ({
                base64: Buffer.from(source.uri).toString('base64'),
                width: 1600,
                height: 1200,
              }),
            }),
          }),
        },
      },
    },
    { process: { env: { EXPO_PUBLIC_ANALYSIS_API_URL: 'https://test' } }, fetch: fetcher },
  );
  return { ...api, sizes };
}
const result = { is_blend: 0, origin: '에티오피아', official_notes: ['복숭아'], beans: [] };
test('client coalesces requests, resizes, isolates cache results and supports forced analysis', async () => {
  let calls = 0;
  const api = service(async () => {
    calls++;
    return Response.json({ result });
  });
  const [first, second] = await Promise.all([
    api.analyzeCardImages(['photo']),
    api.analyzeCardImages(['photo']),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(api.sizes, [{ width: 1600 }]);
  first.official_notes.push('changed');
  assert.deepEqual(second.official_notes, ['복숭아']);
  assert.deepEqual((await api.analyzeCardImages(['photo'])).official_notes, ['복숭아']);
  assert.equal(calls, 1);
  await api.analyzeCardImages(['photo'], { force: true });
  assert.equal(calls, 2);
});
test('client does not automatically retry server or network failures', async () => {
  for (const network of [false, true]) {
    let calls = 0;
    const api = service(async () => {
      calls++;
      if (network) throw new TypeError('network');
      return Response.json({ code: 'PROVIDER_TIMEOUT' }, { status: 504 });
    });
    await assert.rejects(api.analyzeCardImages(['photo']), {
      code: network ? 'NETWORK_ERROR' : 'PROVIDER_TIMEOUT',
    });
    assert.equal(calls, 1);
  }
});
function hook(analyze) {
  const state = {
    notePhotos: ['photo'],
    origin: 'old',
    farm: 'old',
    analyzed: false,
    myNotes: ['manual'],
  };
  state.updateDraft = (value) => Object.assign(state, value);
  state.setField = (key, value) => {
    state[key] = value;
  };
  const store = (select) => select(state);
  store.getState = () => state;
  const effects = [];
  const api = load('src/hooks/useCafeLogAnalysis.ts', {
    react: {
      useState: (value) => [value, () => {}],
      useRef: (value) => ({ current: value }),
      useEffect: (effect) => {
        effects.push(effect());
      },
    },
    '@/src/services/visionLLM': { analyzeCardImages: analyze, CardAnalysisError: Error },
    '@/src/store/cafeLogDraftStore': { useCafeLogDraftStore: store },
  }).useCafeLogAnalysis();
  return { ...api, state, unmount: () => effects.forEach((cleanup) => cleanup?.()) };
}
test('success clears stale AI fields while preserving personal notes; failure stays unanalyzed', async () => {
  const success = hook(async () => result);
  await success.runCardAnalysis();
  assert.equal(success.state.farm, '');
  assert.equal(success.state.analyzed, true);
  assert.deepEqual(success.state.myNotes, ['manual']);
  const failure = hook(async () => {
    throw new Error('timeout');
  });
  await failure.runCardAnalysis();
  assert.equal(failure.state.analyzed, false);
  assert.equal(failure.state.origin, 'old');
});
test('late results cannot overwrite replacement photos or an unmounted draft', async () => {
  for (const unmount of [false, true]) {
    let resolve;
    let calls = 0;
    const api = hook(() => {
      calls++;
      return new Promise((done) => {
        resolve = done;
      });
    });
    const pending = api.runCardAnalysis();
    await api.runCardAnalysis();
    assert.equal(calls, 1);
    if (unmount) api.unmount();
    else api.state.notePhotos = ['replacement'];
    resolve(result);
    await pending;
    assert.equal(api.state.origin, 'old');
    assert.equal(api.state.analyzed, false);
  }
});
