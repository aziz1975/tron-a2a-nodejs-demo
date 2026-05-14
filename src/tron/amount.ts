export const SUN_PER_TRX = 1_000_000n;

export function parseTrxToSun(amountTrx: string): bigint {
  const normalized = amountTrx.trim();
  const match = /^(\d+)(?:\.(\d{1,6})?)?$/.exec(normalized);

  if (!match) {
    throw new Error("Amount must be a positive TRX value with up to 6 decimal places.");
  }

  const wholePart = match[1];

  if (!wholePart) {
    throw new Error("Amount must include a whole-number TRX component.");
  }

  const whole = BigInt(wholePart);
  const fractional = BigInt((match[2] ?? "").padEnd(6, "0"));
  const sun = whole * SUN_PER_TRX + fractional;

  if (sun <= 0n) {
    throw new Error("Amount must be greater than 0 TRX.");
  }

  return sun;
}

export function formatSunToTrx(sun: bigint | number | string): string {
  const value = BigInt(sun);
  const whole = value / SUN_PER_TRX;
  const fractional = value % SUN_PER_TRX;

  if (fractional === 0n) {
    return whole.toString();
  }

  return `${whole}.${fractional.toString().padStart(6, "0").replace(/0+$/, "")}`;
}

export function assertSafeSunNumber(sun: bigint): number {
  if (sun > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Amount is too large for this demo transaction builder.");
  }

  return Number(sun);
}
