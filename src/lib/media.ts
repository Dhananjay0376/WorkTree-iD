import { uid } from "./storage";

const DB_NAME = 'WorkTree_Media_DB';
const STORE_NAME = 'media';
const DB_VERSION = 1;

/** Initialize IndexedDB */
async function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Compress image to stay under Firestore limits (~1MB total per doc, aiming for <100KB per image) */
async function compressImage(file: File): Promise<string | null> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max resolution for syncable photos
                const MAX_DIM = 800;
                if (width > height) {
                    if (width > MAX_DIM) {
                        height *= MAX_DIM / width;
                        width = MAX_DIM;
                    }
                } else {
                    if (height > MAX_DIM) {
                        width *= MAX_DIM / height;
                        height = MAX_DIM;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Use low-mid quality to ensure it fits in Firestore easily
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

                // If still too large (> 300KB), we won't sync it as base64
                if (dataUrl.length > 400000) {
                    resolve(null);
                } else {
                    resolve(dataUrl);
                }
            };
            img.onerror = () => resolve(null);
        };
        reader.onerror = () => resolve(null);
    });
}

/** 
 * Saves media based on type and size.
 * Returns a string reference starting with 'sync:' or 'local:'
 */
export async function saveMedia(file: File): Promise<string> {
    // 1. Try to compress and sync if it's an image
    if (file.type.startsWith('image/')) {
        const compressed = await compressImage(file);
        if (compressed) {
            return `sync:${compressed}`;
        }
    }

    // 2. Fallback to local IndexedDB (Videos or large high-res photos)
    const id = uid('media');
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await new Promise<void>((resolve, reject) => {
        const request = tx.objectStore(STORE_NAME).put(file, id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });

    return `local:${id}`;
}

/** 
 * Resolves a media reference to a usable URL or base64 string.
 */
export async function resolveMedia(mediaRef: string): Promise<string | null> {
    if (mediaRef.startsWith('sync:')) {
        return mediaRef.replace('sync:', '');
    }

    if (mediaRef.startsWith('local:')) {
        const id = mediaRef.replace('local:', '');
        const db = await getDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const blob = await new Promise<Blob | null>((resolve, reject) => {
            const request = tx.objectStore(STORE_NAME).get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (blob) {
            return URL.createObjectURL(blob);
        }
    }

    return null;
}
