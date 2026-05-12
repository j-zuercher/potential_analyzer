// Exact normalized-string match. No Levenshtein (Phase 7 PM cut, spec §4.1).
// Pure: no IO, no time, no randomness.

import type { DemoAddress } from '../data/types';
import { ok, fail, type Result } from '../lib/result';

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}

// Returns the matched DemoAddress or 'no_match'.
export function addressMatch(
  input: string,
  addresses: readonly DemoAddress[]
): Result<DemoAddress, 'no_match'> {
  const needle = normalize(input);
  if (!needle) return fail('no_match');

  for (const address of addresses) {
    for (const key of address.search_keys) {
      if (normalize(key) === needle) {
        return ok(address);
      }
    }
  }
  return fail('no_match');
}
