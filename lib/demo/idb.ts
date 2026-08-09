/**
 * IndexedDB-backed demo store.
 *
 * localStorage keeps the small preference/state objects (lib/demo/storage.ts);
 * IndexedDB carries the larger payloads — full course contracts saved for
 * offline reading — without the 5 MB localStorage ceiling. All helpers are
 * promisified and fail soft (unavailable stores, private mode, Safari < 10)
 * so the demo never breaks when offline storage is missing.
 */

const DB_NAME = "zapsters-demo-v1";
const COURSE_STORE = "courses";
const META_STORE = "meta";

export interface CachedCourseRecord {
  course_id: string;
  payload: unknown;
  cached_at: string;
}

type DemoDatabase = {
  db: IDBDatabase | null;
  opening: Promise<IDBDatabase> | null;
};

const state: DemoDatabase = { db: null, opening: null };

/** Wrap a single IDBRequest in a promise (success/error/blocked). */
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  if (state.db) return Promise.resolve(state.db);
  if (state.opening) return state.opening;

  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available."));
  }

  state.opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(COURSE_STORE)) {
        db.createObjectStore(COURSE_STORE, { keyPath: "course_id" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      state.db = request.result;
      state.opening = null;
      resolve(request.result);
    };
    request.onerror = () => {
      state.opening = null;
      reject(request.error ?? new Error("IndexedDB open failed."));
    };
  });

  return state.opening;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  storeName: string,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  const transaction = db.transaction(storeName, mode);
  return promisifyRequest(run(transaction.objectStore(storeName)));
}

/** Cache a full course contract for offline reading. */
export async function idbCacheCourse(
  courseId: string,
  payload: unknown,
): Promise<void> {
  try {
    const record: CachedCourseRecord = {
      course_id: courseId,
      payload,
      cached_at: new Date().toISOString(),
    };
    await withStore("readwrite", COURSE_STORE, (store) => store.put(record));
  } catch {
    // Offline storage unavailable — the demo simply doesn't persist.
  }
}

/** Read a cached course payload (or null when not saved / unavailable). */
export async function idbReadCourse(
  courseId: string,
): Promise<CachedCourseRecord | null> {
  try {
    const record = await withStore<CachedCourseRecord | undefined>(
      "readonly",
      COURSE_STORE,
      (store) => store.get(courseId) as IDBRequest<CachedCourseRecord | undefined>,
    );
    return record ?? null;
  } catch {
    return null;
  }
}

/** List every course saved for offline reading (metadata only). */
export async function idbListCachedCourses(): Promise<
  { course_id: string; cached_at: string }[]
> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(COURSE_STORE, "readonly");
    const request = transaction.objectStore(COURSE_STORE).getAll() as IDBRequest<
      CachedCourseRecord[]
    >;
    const records = await promisifyRequest(request);
    return records.map((record) => ({
      course_id: record.course_id,
      cached_at: record.cached_at,
    }));
  } catch {
    return [];
  }
}

/** Remove a single cached course. */
export async function idbRemoveCourse(courseId: string): Promise<void> {
  try {
    await withStore("readwrite", COURSE_STORE, (store) => store.delete(courseId));
  } catch {
    // No-op when unavailable.
  }
}

/** Clear every cached course payload (used by the demo reset). */
export async function idbClearCourses(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(COURSE_STORE, "readwrite");
      transaction.objectStore(COURSE_STORE).clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // No-op when unavailable.
  }
}

interface MetaRecord<T> {
  key: string;
  value: T;
}

/** Generic metadata read/write (e.g. last-seen tour version). */
export async function idbGetMeta<T>(key: string): Promise<T | null> {
  try {
    const record = await withStore<MetaRecord<T> | undefined>(
      "readonly",
      META_STORE,
      (store) => store.get(key) as IDBRequest<MetaRecord<T> | undefined>,
    );
    return record?.value ?? null;
  } catch {
    return null;
  }
}

export async function idbSetMeta<T>(key: string, value: T): Promise<void> {
  try {
    const record: MetaRecord<T> = { key, value };
    await withStore("readwrite", META_STORE, (store) => store.put(record));
  } catch {
    // No-op when unavailable.
  }
}

/** True when IndexedDB is reachable in this browser (feature detection). */
export function idbSupported(): boolean {
  return typeof indexedDB !== "undefined";
}
