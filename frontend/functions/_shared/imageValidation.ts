// Part 2 (Business Card image processing / secure upload foundation): shared server-side
// image validation for any endpoint that accepts a browser-supplied data: URL (today, only
// business-cards/scan.ts). Never trusts the declared MIME type or the data: URL's own prefix
// alone -- always re-checks the REAL magic bytes of the decoded payload against an explicit
// allowlist, and sanity-checks the decoded dimensions, before anything downstream (e.g. the
// AI extraction call, or a database write) ever sees the bytes.
export type ImageValidationResult =
  | { ok: true; bytes: Uint8Array; mime: "image/jpeg" | "image/png" | "image/webp"; width: number; height: number }
  | { ok: false; error: string; message: string };

const MIN_DIMENSION = 80;
const MAX_DIMENSION = 8000;

export function validateImageDataUrl(dataUrl: string, maxBytes: number): ImageValidationResult {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || comma < 0) {
    return { ok: false, error: "invalid_image", message: "That doesn't look like an image." };
  }

  let bytes: Uint8Array;
  try {
    const bin = atob(dataUrl.slice(comma + 1));
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch {
    return { ok: false, error: "invalid_image", message: "That image file looks corrupted. Please try again." };
  }

  if (bytes.length > maxBytes) {
    return { ok: false, error: "image_too_large", message: "That photo is too large. Please retake it." };
  }
  if (bytes.length < 16) {
    return { ok: false, error: "invalid_image", message: "That doesn't look like a valid image." };
  }

  // Everything past this point is pure byte-parsing of attacker-controlled input -- wrapped so
  // a malformed/crafted file can never throw an unhandled exception, only a clean rejection.
  try {
    const mime = sniffMime(bytes);
    if (!mime) {
      return { ok: false, error: "unsupported_format", message: "Please use a JPEG, PNG, or WEBP photo." };
    }

    const dims = mime === "image/jpeg" ? readJpegDimensions(bytes) : mime === "image/png" ? readPngDimensions(bytes) : readWebpDimensions(bytes);
    if (!dims) {
      return { ok: false, error: "invalid_image", message: "That image could not be read. Please try a different photo." };
    }
    if (dims.width < MIN_DIMENSION || dims.height < MIN_DIMENSION || dims.width > MAX_DIMENSION || dims.height > MAX_DIMENSION) {
      return { ok: false, error: "invalid_image", message: "That image's dimensions look invalid. Please try a different photo." };
    }

    return { ok: true, bytes, mime, width: dims.width, height: dims.height };
  } catch {
    return { ok: false, error: "invalid_image", message: "That image could not be processed. Please try a different photo." };
  }
}

function sniffMime(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}

// PNG: the IHDR chunk is always first, at a fixed offset -- width @16..19, height @20..23,
// big-endian.
function readPngDimensions(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 24) return null;
  const width = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
  const height = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
  return width > 0 && height > 0 ? { width, height } : null;
}

// JPEG: walk the marker segments looking for a SOFx (start-of-frame) marker, which carries the
// real pixel dimensions. Anything unparsable returns null -> rejected, never guessed at.
function readJpegDimensions(b: Uint8Array): { width: number; height: number } | null {
  let i = 2; // skip the leading 0xFFD8 (SOI)
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const marker = b[i + 1];
    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (marker === 0xd8 || marker === 0xd9) { i += 2; continue; } // SOI/EOI carry no length field
    const segLen = (b[i + 2] << 8) | b[i + 3];
    if (isSOF) {
      const height = (b[i + 5] << 8) | b[i + 6];
      const width = (b[i + 7] << 8) | b[i + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    if (segLen < 2) return null;
    i += 2 + segLen;
  }
  return null;
}

// WEBP: handles the common VP8X (extended) and simple lossy VP8 chunk headers -- enough to
// sanity-check dimensions. Lossless VP8L is intentionally not parsed and rejected instead of
// guessed at; in practice every image reaching this endpoint is re-encoded to JPEG client-side
// first (see HomeClient.tsx bcNormalizeImage), so WEBP only matters as defense-in-depth for a
// caller that bypasses the UI.
function readWebpDimensions(b: Uint8Array): { width: number; height: number } | null {
  if (b.length < 30) return null;
  const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (chunk === "VP8X") {
    const width = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
    const height = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
    return width > 0 && height > 0 ? { width, height } : null;
  }
  if (chunk === "VP8 " && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) {
    const width = (b[26] | (b[27] << 8)) & 0x3fff;
    const height = (b[28] | (b[29] << 8)) & 0x3fff;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  return null;
}
