// A template and its data folded into the URL hash, so a link carries the
// whole editor state and nothing is stored anywhere. Deflate then
// base64url; a hash for the invoice is about a kilobyte.

export interface Shared {
  code: string;
  data: string;
}

const PREFIX = "#s=";

export async function encodeShare(s: Shared): Promise<string> {
  const stream = new Blob([JSON.stringify([s.code, s.data])]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return PREFIX + toBase64Url(bytes);
}

/** The state in a hash, or undefined when the hash is not a share link. */
export async function decodeShare(hash: string): Promise<Shared | undefined> {
  if (!hash.startsWith(PREFIX)) return undefined;
  try {
    const bytes = fromBase64Url(hash.slice(PREFIX.length));
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const [code, data] = JSON.parse(await new Response(stream).text()) as [string, string];
    return { code, data };
  } catch {
    return undefined;
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
