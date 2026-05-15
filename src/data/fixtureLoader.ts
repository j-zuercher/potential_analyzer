// Loads + Zod-validates the three JSON fixtures at module-eval time.
// Throws loud on validation failure (spec §4.4: boot-time error mode).
// The thrown error includes the full Zod issue tree, formatted for the dev
// console. The user sees a blank page; the dev sees what is wrong.

import {
  DemoAddressesSchema,
  EconomicAssumptionsSchema,
  BaukostenTableSchema,
  type DemoAddresses,
  type EconomicAssumptions,
  type BaukostenTable,
} from './types';

import demoAddressesRaw from './demo_addresses.json';
import economicAssumptionsRaw from './economic_assumptions.json';
import baukostenRaw from './baukosten.json';

function validateOrThrow<T>(
  label: string,
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: { format: () => unknown } } },
  rawData: unknown
): T {
  const result = schema.safeParse(rawData);
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
  DemoAddressesSchema,
  demoAddressesRaw
);

export const economicAssumptions: EconomicAssumptions = validateOrThrow(
  'economic_assumptions.json',
  EconomicAssumptionsSchema,
  economicAssumptionsRaw
);

export const baukostenTable: BaukostenTable = validateOrThrow(
  'baukosten.json',
  BaukostenTableSchema,
  baukostenRaw
);

// Convenience bundle for compute layer.
export const fixtures = {
  addresses: demoAddresses,
  economics: economicAssumptions,
  baukosten: baukostenTable,
} as const;

export type Fixtures = typeof fixtures;
