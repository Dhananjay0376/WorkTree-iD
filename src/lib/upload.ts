import { saveMedia } from "./media";

/**
 * Saves a file locally or for sync and returns a reference URL.
 * signature kept for compatibility.
 */
export async function uploadFile(
    file: File,
    _path: string, // kept for signature compatibility
    onProgress?: (progress: number) => void
): Promise<string> {
    if (onProgress) onProgress(50); // Immediate feedback
    const ref = await saveMedia(file);
    if (onProgress) onProgress(100);
    return ref;
}
