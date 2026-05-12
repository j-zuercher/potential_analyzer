// Loads + Zod-validates the two JSON fixtures at module-eval time.
// Throws loud on validation failure (spec §4.4: boot-time error mode).
// The thrown error includes the full Zod issue tree, formatted for the dev
// console. The user sees a blank page; the dev sees what is wrong.

import {
  DemoAddressesSchema,
  EconomicAssumptionsSchema,
  type DemoAddresses,
  type EconomicAssumptions,
} from './types';

import demoAddressesRaw from './demo_addresses.json';
import economicAssumptionsRaw from './economic_assumptions.json';

function validateOrThrow<T>(
  label: string,
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: { format: () => unknown } } }
): T {
  const result = schema.safeParse(label === 'demo_addresses.json' ? demoAddressesRaw : economicAssumptionsRaw);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error(`[fixtureLoader] ${label} failed Zod validation:`, result.error?.format());
    throw new Error(
      `Fixture ${label} did not validate. See console for the Zod issue tree.`
    );
  }
  return result.data as T;
}

export const demoAddresses: DemoAddresses = validateOrThrow(
  'demo_addresses.json',
  DemoAddressesSchema
);

export const economicAssumptions: EconomicAssumptions = validateOrThrow(
  'economic_assumptions.json',
  EconomicAssumptionsSchema
);

// Convenience bundle for compute layer.
export const fixtures = {
  addresses: demoAddresses,
  economics: economicAssumptions,
} as const;

export type Fixtures = typeof fixtures;
