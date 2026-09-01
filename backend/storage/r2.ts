// R2 helper: object key conventions + signed/public URL resolution.
// Key convention: {albumId}/{mediaId}/{variant}.{ext}
//   variant ∈ original | web | thumbnail | watermarked
import type { Env } from "../database/client";

export type MediaVariant = "original" | "web" | "thumbnail" | "watermarked";

export function buildObjectKey(
  albumId: string,
  mediaId: string,
  variant: MediaVariant,
  ext: string
): string {
  return `${albumId}/${mediaId}/${variant}.${ext}`;
}

export function publicUrlFor(env: Env, key: string): string {
  return `${env.R2_PUBLIC_URL}/${key}`;
}

export async function putObject(
  env: Env,
  key: string,
  body: ReadableStream | ArrayBuffer,
  contentType: string
): Promise<void> {
  await env.MEDIA_BUCKET.put(key, body, {
    httpMetadata: { contentType },
  });
}

export async function deleteObject(env: Env, key: string): Promise<void> {
  await env.MEDIA_BUCKET.delete(key);
}

export async function getObject(env: Env, key: string) {
  return env.MEDIA_BUCKET.get(key);
}
