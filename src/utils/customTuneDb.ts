import { CustomTune, CustomTuneMeta } from '../types/study';

const DB_NAME = 'Kilostudy Planner-audio-db';
const DB_VERSION = 1;
const STORE_NAME = 'customTunes';
export const MAX_CUSTOM_TUNE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg'];
const ALLOWED_MIME_PREFIXES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/aac',
  'audio/ogg',
  'application/ogg',
];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB.'));
  });
}

export function validateAudioFile(file: File): string | null {
  if (file.size > MAX_CUSTOM_TUNE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `File is too large (${mb} MB). Maximum allowed size is 5 MB.`;
  }

  const lowerName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const mime = (file.type || '').toLowerCase();
  const hasValidMime = ALLOWED_MIME_PREFIXES.some((prefix) => mime.includes(prefix));

  if (!hasValidExt && !hasValidMime) {
    return 'Unsupported file format. Please upload an MP3, WAV, M4A, or OGG audio file.';
  }

  return null;
}

export async function listCustomTunes(): Promise<CustomTuneMeta[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = (req.result as CustomTune[]).map(({ blob: _blob, ...meta }) => meta);
        items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        resolve(items);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveCustomTune(file: File): Promise<CustomTuneMeta> {
  const validationError = validateAudioFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const id = `tune-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || 'Custom Tune';
  const record: CustomTune = {
    id,
    name: cleanName,
    mimeType: file.type || 'audio/mpeg',
    sizeBytes: file.size,
    createdAt: new Date().toISOString(),
    blob: file,
  };

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save audio file.'));
  });

  const { blob: _blob, ...meta } = record;
  return meta;
}

export async function getCustomTuneBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => {
        const record = req.result as CustomTune | undefined;
        resolve(record?.blob ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteCustomTune(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to delete custom tune.'));
  });
}
