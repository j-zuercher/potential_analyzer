// Zod schemas are the source of truth. TS types are inferred to avoid drift.
// Anything imported from `data/types` carries both compile-time and runtime
// validation guarantees. See spec §6.1.

import { z } from 'zod';

// Enums
export const BauweiseSchema = z.enum(['Massiv', 'Holz', 'Mischbau']);
export type Bauweise = z.infer<typeof BauweiseSchema>;

export const AusbaustandarSchema = z.enum(['niedrig', 'mittel', 'hoch']);
export type Ausbaustandard = z.infer<typeof AusbaustandarSchema>;

export const AmpelStatusSchema = z.enum(['green', 'yellow', 'red']);
export type AmpelStatus = z.infer<typeof AmpelStatusSchema>;

export const IsosStatusSchema = z.enum(['none', 'hinweis', 'inventar']);
export type IsosStatus = z.infer<typeof IsosStatusSchema>;

export const DenkmalStatusSchema = z.enum(['none', 'inventar']);
export type DenkmalStatus = z.infer<typeof DenkmalStatusSchema>;

const StadtkreisSchema = z.union([
  z.literal(1), z.literal(2),  z.literal(3),  z.literal(4),
  z.literal(5), z.literal(6),  z.literal(7),  z.literal(8),
  z.literal(9), z.literal(10), z.literal(11), z.literal(12),
]);
export type Stadtkreis = z.infer<typeof StadtkreisSchema>;

// One curated demo address. See spec §8 for the 6 expected pitch-role slots.
export const DemoAddressSchema = z.object({
  display: z.string().min(1),
  search_keys: z.array(z.string().min(1)).min(2).max(6),
  egid: z.number().int().positive(),
  egrid: z.string().min(1),
  stadtkreis: StadtkreisSchema,
  zone_code: z.string().min(1),
  bauweise_bestand: BauweiseSchema,
  parzelle_m2: z.number().positive(),
  bestehende_bgf: z.number().nonnegative(),
  baujahr: z.number().int().min(1700).max(2100),
  isos_status: IsosStatusSchema,
  denkmal_status: DenkmalStatusSchema,
  // Dev-only diagnostic field, never surfaced in UI (spec §6.1).
  notes: z.string().optional(),
});
export type DemoAddress = z.infer<typeof DemoAddressSchema>;

// One zone's BZO 2016 and 2026 AZ values (Decision E, spec §11).
export const ZoneRuleSchema = z.object({
  code: z.string().min(1),
  az_2016: z.number().nonnegative(),
  az_2026: z.number().nonnegative(),
});
export type ZoneRule = z.infer<typeof ZoneRuleSchema>;

// Marktwert range, keyed by [zone][stadtkreis]. See spec §7.3.
export const MarktwertEntrySchema = z.object({
  low_chf_per_m2: z.number().positive(),
  high_chf_per_m2: z.number().positive(),
  source: z.string().optional(), // attribution per cell, see Phase 7 pressure-test 2
});
export type MarktwertEntry = z.infer<typeof MarktwertEntrySchema>;

// Baukosten range per Bauweise, from AllHebel section 5.2.
export const BaukostenEntrySchema = z.object({
  low_chf_per_m2: z.number().positive(),
  high_chf_per_m2: z.number().positive(),
});
export type BaukostenEntry = z.infer<typeof BaukostenEntrySchema>;

// Computation constants. Lives in fixtures so demo prep can tune without code changes.
export const ConstantsSchema = z.object({
  STATIK_SURCHARGE_PCT: z.number().nonnegative(),
  NEBENKOSTEN_PCT: z.number().nonnegative(),
  BZO_COMPARE_THRESHOLD: z.number().nonnegative(),
});
export type Constants = z.infer<typeof ConstantsSchema>;

// Top-level economic_assumptions.json schema.
export const EconomicAssumptionsSchema = z.object({
  marktwert: z.record(z.string(), z.record(z.string(), MarktwertEntrySchema)),
  baukosten: z.record(BauweiseSchema, BaukostenEntrySchema),
  bzo: z.object({
    bzo_2016: z.record(z.string(), z.number().nonnegative()),
    bzo_2026: z.record(z.string(), z.number().nonnegative()),
  }),
  constants: ConstantsSchema,
});
export type EconomicAssumptions = z.infer<typeof EconomicAssumptionsSchema>;

// Top-level demo_addresses.json schema.
export const DemoAddressesSchema = z.array(DemoAddressSchema).min(1);
export type DemoAddresses = z.infer<typeof DemoAddressesSchema>;

// What the compute layer returns to the UI. See spec §6.1.
export interface AnalysisResult {
  address: DemoAddress;
  reserve_m2: { bzo_2016: number; bzo_2026: number; show_compare: boolean };
  net_chf: { low: number; base: number; high: number };
  feasibility: { az_reserve: AmpelStatus; isos: AmpelStatus; denkmal: AmpelStatus };
  confidence: number;
  caveats: string[];
}

// v0.5: live address lookup result, replaces DemoAddress for the primary path.
export const ResolvedAddressSchema = z.object({
  display: z.string().min(1),
  egrid: z.string().min(1),
  egid: z.number().int().positive().optional(),
  lat: z.number(),
  lon: z.number(),
  stadtkreis: StadtkreisSchema,
  zone_code: z.string().min(1),
  parzelle_m2: z.number().positive(),
  bestehende_bgf: z.number().nonnegative(),
  baujahr: z.number().int().min(1700).max(2100).optional(),
  bauweise_bestand: BauweiseSchema,
  isos_status: IsosStatusSchema,
  denkmal_status: DenkmalStatusSchema,
});
export type ResolvedAddress = z.infer<typeof ResolvedAddressSchema>;

// v0.5: optional user inputs from the UI (Ausbaustandard + optional asking price).
export const UserInputsSchema = z.object({
  ausbaustandard: AusbaustandarSchema,
  asking_price_chf: z.number().positive().optional(),
});
export type UserInputs = z.infer<typeof UserInputsSchema>;

// v0.5: schema for marktwert_zh.json — [zone_code][stadtkreis_str] → entry.
export const MarktwertTableSchema = z.record(
  z.string(),
  z.record(z.string(), MarktwertEntrySchema)
);
export type MarktwertTable = z.infer<typeof MarktwertTableSchema>;

// v0.5: schema for baukosten.json — [bauweise][ausbaustandard] → entry.
export const BaukostenTableSchema = z.record(
  BauweiseSchema,
  z.record(AusbaustandarSchema, BaukostenEntrySchema)
);
export type BaukostenTable = z.infer<typeof BaukostenTableSchema>;

// v0.5: result type for the live async analysis path (uses ResolvedAddress + userInputs).
export interface LiveAnalysisResult {
  address: ResolvedAddress;
  reserve_m2: { bzo_2016: number; bzo_2026: number; show_compare: boolean };
  net_chf: { low: number; base: number; high: number };
  feasibility: { az_reserve: AmpelStatus; isos: AmpelStatus; denkmal: AmpelStatus };
  confidence: number;
  caveats: string[];
  userInputs: UserInputs;
}
