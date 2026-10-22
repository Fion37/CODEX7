export const assetMimeTypes = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/wav",
  "audio/mpeg",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/json",
  "text/plain",
  "text/csv",
];
export function isAllowedAssetMime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const [base, ...parameters] = value.split(";");
  return (
    assetMimeTypes.includes(base) &&
    parameters.every((p) => /^codecs=[\w-]+$/.test(p))
  );
}
