/** Live Gemini Flash IDs from https://ai.google.dev/gemini-api/docs/models (Nov 2026). */
export const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

/** Retired or shut-down model codes that must never be sent to generateContent. */
export const SHUT_DOWN_MODELS = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "gemini-2.0-flash-lite-preview",
  "gemini-2.0-flash-lite-preview-02-05",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
]);

export function isUsableModelKey(key: string | null | undefined) {
  if (!key) return false;
  return !SHUT_DOWN_MODELS.has(key);
}
