/** Client-side logo processing: center-crop to 1:1, resize, compress to a
 *  small data-URI that is stored on-chain in the token metadata. */

const SIZE = 128; // output px (square)
const MAX_BYTES = 24 * 1024; // keep on-chain storage cost reasonable

export async function processLogoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Not an image file");

  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();

  // step quality down until it fits
  for (const q of [0.85, 0.7, 0.55, 0.4, 0.25]) {
    const url = canvas.toDataURL("image/webp", q);
    if (dataUriBytes(url) <= MAX_BYTES) return url;
  }
  // last resort: shrink to 96px at low quality
  const small = document.createElement("canvas");
  small.width = 96;
  small.height = 96;
  small.getContext("2d")!.drawImage(canvas, 0, 0, 96, 96);
  const url = small.toDataURL("image/webp", 0.3);
  if (dataUriBytes(url) <= MAX_BYTES) return url;
  throw new Error("Image too complex to compress — try a simpler one");
}

export function dataUriBytes(dataUri: string): number {
  const b64 = dataUri.split(",")[1] ?? "";
  return Math.floor((b64.length * 3) / 4);
}
