export type Cents = number & { readonly __brand: 'Cents' };

export function toCents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `Cents must be a safe integer, received ${String(value)}`,
    );
  }
  return value as Cents;
}
