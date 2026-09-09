import { Directory, File, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_CACHE_BYTES = 100 * 1024 * 1024;
const pending = new Map<string, Promise<string | undefined>>();
let queue: Promise<unknown> = Promise.resolve();
const cacheDirectory = () => new Directory(Paths.cache, 'cafe-thumbnails-v1');

function keyFor(uri: string) {
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < uri.length; i++) {
    a = Math.imul(a ^ uri.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ uri.charCodeAt(i);
  }
  return `${uri.length}-${a >>> 0}-${b >>> 0}.jpg`;
}

function prune(directory: Directory, keep: string) {
  const files = directory.list().filter((entry): entry is File => entry instanceof File);
  let total = files.reduce((sum, file) => sum + file.size, 0);
  for (const file of files.sort((a, b) => (a.modificationTime ?? 0) - (b.modificationTime ?? 0))) {
    if (total <= MAX_CACHE_BYTES) break;
    if (file.uri === keep) continue;
    const size = file.size;
    file.delete();
    total -= size;
  }
}

export function cachedThumbnail(uri: string): string | undefined {
  try {
    const file = new File(cacheDirectory(), keyFor(uri));
    return file.exists && file.size > 0 ? file.uri : undefined;
  } catch {
    return undefined;
  }
}

export function getThumbnail(uri: string): Promise<string | undefined> {
  const cached = cachedThumbnail(uri);
  if (cached) return Promise.resolve(cached);
  const existing = pending.get(uri);
  if (existing) return existing;
  // Serialize native decoding so opening a large grid cannot exhaust image memory.
  const task = queue.then(async () => {
    let source: Awaited<ReturnType<typeof Image.loadAsync>> | undefined;
    let context: ReturnType<typeof ImageManipulator.manipulate> | undefined;
    let rendered:
      | Awaited<ReturnType<ReturnType<typeof ImageManipulator.manipulate>['renderAsync']>>
      | undefined;
    let temporary: File | undefined;
    try {
      const hit = cachedThumbnail(uri);
      if (hit) return hit;
      const directory = cacheDirectory();
      directory.create({ idempotent: true, intermediates: true });
      source = await Image.loadAsync(uri, { maxWidth: 800, maxHeight: 800 });
      context = ImageManipulator.manipulate(source);
      if (source.width > 800 || source.height > 800) {
        context.resize(source.width >= source.height ? { width: 800 } : { height: 800 });
      }
      rendered = await context.renderAsync();
      const output = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.78 });
      temporary = new File(output.uri);
      const target = new File(directory, keyFor(uri));
      temporary.move(target);
      temporary = undefined;
      prune(directory, target.uri);
      return target.uri;
    } catch {
      // Missing legacy originals or a full disk must not prevent opening a record.
      return undefined;
    } finally {
      if (temporary?.exists) temporary.delete();
      rendered?.release();
      context?.release();
      source?.release();
    }
  });
  pending.set(uri, task);
  queue = task.catch(() => undefined);
  void task.finally(() => pending.delete(uri)).catch(() => undefined);
  return task;
}

// Picker URIs may point to disposable cache files. Keep new originals in Documents.
export function persistPhotoUris(json?: string): string | undefined {
  if (!json) return undefined;
  const uris: string[] = JSON.parse(json);
  const directory = new Directory(Paths.document, 'cafe-originals');
  directory.create({ idempotent: true, intermediates: true });
  return JSON.stringify(
    uris.map((uri) => {
      if (uri.startsWith(`${directory.uri}/`)) return uri;
      const source = new File(uri);
      const extension = source.extension || '.jpg';
      const target = new File(
        directory,
        `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`,
      );
      source.copy(target);
      return target.uri;
    }),
  );
}
