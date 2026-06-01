/**
 * Client-side image compression and thumbnail generation utilities.
 * Uses the Canvas API — only works in browser environments.
 */

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

/**
 * Compress a base64 data-URL image.
 * @param base64    Full data-URL string (data:image/...;base64,...)
 * @param maxWidth  Maximum width in pixels (default 1200)
 * @param quality   JPEG/WebP quality 0-1 (default 0.8)
 * @returns         Compressed data-URL string
 */
export function compressImage(
  base64: string,
  maxWidth = 1200,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      // SSR fallback — return as-is
      resolve(base64);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Prefer WebP for smaller size, fall back to JPEG
        let result = canvas.toDataURL("image/webp", quality);
        if (result === "data:,") {
          // WebP not supported
          result = canvas.toDataURL("image/jpeg", quality);
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image for compression"));
    img.src = base64;
  });
}

/**
 * Generate a small square thumbnail (for avatars).
 * @param base64  Full data-URL string
 * @param size    Width & height in pixels (default 200)
 * @returns       Thumbnail data-URL string
 */
export function generateThumbnail(base64: string, size = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      resolve(base64);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(base64);
          return;
        }

        // Center-crop to square
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        let result = canvas.toDataURL("image/webp", 0.85);
        if (result === "data:,") {
          result = canvas.toDataURL("image/jpeg", 0.85);
        }

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image for thumbnail"));
    img.src = base64;
  });
}

/**
 * Check if a data-URL exceeds the max allowed size (2 MB after base64 decode).
 * @returns true if within limit, false if too large
 */
export function checkImageSize(base64: string): boolean {
  // Base64 encodes 3 bytes into 4 chars, so real size ≈ len * 3/4
  const headerEnd = base64.indexOf(",");
  const rawLength = base64.length - (headerEnd + 1);
  const sizeInBytes = (rawLength * 3) / 4;
  return sizeInBytes <= MAX_FILE_SIZE;
}

/**
 * Compress and validate an image. Returns the compressed data-URL or throws.
 */
export async function processImage(
  base64: string,
  options?: { maxWidth?: number; quality?: number; isAvatar?: boolean }
): Promise<string> {
  let processed: string;

  if (options?.isAvatar) {
    processed = await generateThumbnail(base64, 400);
  } else {
    processed = await compressImage(
      base64,
      options?.maxWidth ?? 1200,
      options?.quality ?? 0.8
    );
  }

  if (!checkImageSize(processed)) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  return processed;
}
