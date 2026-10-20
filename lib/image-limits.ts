export const MAX_PRODUCT_IMAGES = 4;
export const MAX_IMAGE_BYTES = 800 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const accepted = new Set<string>(ACCEPTED_IMAGE_TYPES);

export function productImageSrc(id: string) {
  return `/api/images/${id}`;
}

export function imageTypeError(type: string) {
  if (accepted.has(type)) return null;
  return "Upload JPEG, PNG, or WebP pictures only.";
}

export function imageSizeError(size: number) {
  if (size <= MAX_IMAGE_BYTES) return null;
  return "Each picture must be under 800KB.";
}
