// True for a plain object, including one without a prototype. False for
// `null`, `undefined`, an array, a string, a number and a function.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
