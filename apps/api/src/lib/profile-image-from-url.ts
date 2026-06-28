import { MAX_IMAGE_BYTES } from "@diuqbank/shared/constants";

import { detectImageFormat, type ParsedImage } from "./image-upload";

/**
 * Best-effort fetch of a contributor's profile picture from an external URL,
 * used by the admin migration endpoint. Downloads the image, enforces the same
 * size limit and magic-byte validation as direct uploads, and returns a
 * `ParsedImage` ready to put into R2.
 *
 * Returns `null` (never throws) on any failure — a bad or unreachable image URL
 * must not abort the migration; the contributor is simply created image-less.
 */
export const fetchProfileImage = async (
  url: string,
): Promise<ParsedImage | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) return null;

    const claimed = Number(res.headers.get("content-length") ?? 0);
    if (claimed > MAX_IMAGE_BYTES) return null;

    const buffer = await res.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) {
      return null;
    }

    const head = new Uint8Array(buffer.slice(0, 12));
    const match = detectImageFormat(head);
    if (!match) return null;

    return { buffer, contentType: match.contentType, ext: match.ext };
  } catch (err) {
    console.error("Profile image fetch failed", url, err);
    return null;
  }
};
