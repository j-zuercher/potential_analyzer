// Swiss German number formatting. Single source of truth (spec §5.4 Rule 4).
// CHF gets the apostrophe thousands separator via Intl.NumberFormat de-CH.
// All output paths through these helpers — no inline string concatenation.

const chfFormatter = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'CHF',
  maximumFractionDigits: 0,
});

const m2Formatter = new Intl.NumberFormat('de-CH', {
  maximumFractionDigits: 0,
});

export function formatCHF(amount: number): string {
  return chfFormatter.format(amount);
}

export function formatM2(amount: number): string {
  return `${m2Formatter.format(amount)} m²`;
}

// "1.3 – 2.6 Mio CHF" — en-dash with spaces, per spec §4.3.
export function formatRangeMio(low: number, high: number): string {
  const lowMio = (low / 1_000_000).toFixed(1);
  const highMio = (high / 1_000_000).toFixed(1);
  return `${lowMio} – ${highMio} Mio CHF`;
}

export function formatSingleMio(amount: number): string {
  return `${(amount / 1_000_000).toFixed(1)} Mio CHF`;
}

export function formatPct(fraction: number): string {
  return `${Math.round(fraction * 100)} %`;
}
