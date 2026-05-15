// Hard gate for Stage B (spec §9, brick 9*). No Stage C work begins until
// every test in this file passes.

import { describe, it, expect } from 'vitest';
import { fixtures } from '../data/fixtureLoader';
import { addressMatch } from './addressMatch';
import { computeReserve } from './computeReserve';
import { applyFeasibility } from './applyFeasibility';
import { computeNetCHF } from './computeNetCHF';
import { confidenceScore } from './confidenceScore';
import { analyze } from './analyze';

const { addresses, economics } = fixtures;
// Demo addresses by pitch role (spec §8 ordering).
const seefeld = addresses[0];   // high potential
const unterstrass = addresses[1]; // borderline
const niederdorf = addresses[2];  // ISOS hinweis
const augustiner = addresses[3];  // Denkmal inventar
const affoltern = addresses[4];   // freshly built
const saatlen = addresses[5];     // BZO transition

describe('addressMatch', () => {
  it('matches exact normalized input', () => {
    const r = addressMatch('Seefeldstrasse 100, 8008 Zürich', addresses);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.display).toBe('Seefeldstrasse 100, 8008 Zürich');
  });
  it('matches case-insensitive', () => {
    const r = addressMatch('seefeldstrasse 100', addresses);
    expect(r.ok).toBe(true);
  });
  it('strips umlauts (ü → u)', () => {
    const r = addressMatch('UniversitÄtstrasse 50', addresses);
    expect(r.ok).toBe(true);
  });
  it('returns no_match on garbage', () => {
    const r = addressMatch('not a real address', addresses);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_match');
  });
  it('returns no_match on empty input', () => {
    const r = addressMatch('   ', addresses);
    expect(r.ok).toBe(false);
  });
});

describe('computeReserve', () => {
  it('Seefeld: 528 max_2016, 624 max_2026, reserves 118 / 214', () => {
    const r = computeReserve(seefeld, economics);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.bzo_2016).toBeCloseTo(118);
    expect(r.data.bzo_2026).toBeCloseTo(214);
    expect(r.data.show_compare).toBe(true); // 45% delta
  });
  it('Unterstrass W4 (AZ 1.50/1.70, 600m², bgf 720): reserves 180 and 300', () => {
    const r = computeReserve(unterstrass, economics);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.bzo_2016).toBe(180);
    expect(r.data.bzo_2026).toBe(300);
    // 720 vs max_2016=900, max_2026=1020; reserves 180 and 300
  });
  it('Affoltern (freshly built): reserve_2026 = 0', () => {
    const r = computeReserve(affoltern, economics);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // max_2026 = 1.30 * 500 = 650, bgf = 650 → reserve = 0
    expect(r.data.bzo_2026).toBe(0);
  });
  it('Saatlen (BZO transition): show_compare true', () => {
    const r = computeReserve(saatlen, economics);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.show_compare).toBe(true);
  });
});

describe('applyFeasibility', () => {
  it('Niederdorf ISOS hinweis: yellow ampel, full reserve preserved', () => {
    const reserve = computeReserve(niederdorf, economics);
    if (!reserve.ok) throw new Error('precondition failed');
    const f = applyFeasibility(niederdorf, reserve.data);
    expect(f.feasibility.isos).toBe('yellow');
    expect(f.feasibility.denkmal).toBe('green');
    // Reserve NOT reduced by ISOS hinweis (Decision C, spec §7.2)
    expect(f.reserve_m2.bzo_2026).toBe(reserve.data.bzo_2026);
  });
  it('Augustiner Denkmal-inventar: red ampel, reserve = 0', () => {
    const reserve = computeReserve(augustiner, economics);
    if (!reserve.ok) throw new Error('precondition failed');
    const f = applyFeasibility(augustiner, reserve.data);
    expect(f.feasibility.denkmal).toBe('red');
    expect(f.reserve_m2.bzo_2026).toBe(0);
    expect(f.reserve_m2.bzo_2016).toBe(0);
    expect(f.feasibility.az_reserve).toBe('red'); // 0 reserve = red
  });
});

describe('computeNetCHF', () => {
  it('Seefeld worked example: net low ~1.27M, high ~2.60M', () => {
    // reserve 214, marktwert[W3][8]=15-18k, baukosten[Massiv]=5.0-7k,
    // surcharge 1.344 (STATIK 20% + NEBEN 12%) → net_low ≈ 1'196'688, net_high ≈ 2'413'920
    // Floor raised 4'500→5'000 per 2025 Zürich cost calibration (ETH/SFP benchmarks).
    const r = computeNetCHF(seefeld, 214, economics);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.low).toBeCloseTo(1_196_688, -2);
    expect(r.data.high).toBeCloseTo(2_413_920, -2);
  });
  it('reserve 0 → all CHF values 0', () => {
    const r = computeNetCHF(seefeld, 0, economics);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.low).toBe(0);
    expect(r.data.high).toBe(0);
    expect(r.data.base).toBe(0);
  });
});

describe('confidenceScore', () => {
  it('Seefeld plain: 70 baseline', () => {
    const c = confidenceScore(seefeld);
    expect(c.score).toBe(70);
    expect(c.caveats[0]).toContain('Statik'); // ISOS not present, Statik wins priority
  });
  it('Niederdorf ISOS hinweis + baujahr 1890 (edge): 70-10-5 = 55', () => {
    const c = confidenceScore(niederdorf);
    expect(c.score).toBe(55);
    expect(c.caveats[0]).toContain('ISOS'); // ISOS wins priority
  });
  it('Augustiner Denkmal-inventar: 0', () => {
    const c = confidenceScore(augustiner);
    expect(c.score).toBe(0);
  });
});

describe('analyze (end-to-end pipeline)', () => {
  it('Seefeld: full result matches spec §7.5', () => {
    const r = analyze('Seefeldstrasse 100, 8008 Zürich', addresses, economics);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.reserve_m2.bzo_2026).toBeCloseTo(214);
    expect(r.data.reserve_m2.bzo_2016).toBeCloseTo(118);
    expect(r.data.reserve_m2.show_compare).toBe(true);
    expect(r.data.feasibility.az_reserve).toBe('green');
    expect(r.data.feasibility.isos).toBe('green');
    expect(r.data.feasibility.denkmal).toBe('green');
    expect(r.data.confidence).toBe(70);
    expect(r.data.net_chf.low).toBeCloseTo(1_196_688, -2);
  });
  it('Niederdorf: ISOS yellow, confidence 55, full reserve preserved', () => {
    const r = analyze('niederdorfstrasse 12', addresses, economics);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.feasibility.isos).toBe('yellow');
    expect(r.data.confidence).toBe(55);
    expect(r.data.reserve_m2.bzo_2026).toBeGreaterThan(0);
    expect(r.data.caveats[0]).toContain('ISOS');
  });
  it('Augustiner: Denkmal red, reserve 0, CHF all 0', () => {
    const r = analyze('Augustinergasse 5', addresses, economics);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.feasibility.denkmal).toBe('red');
    expect(r.data.reserve_m2.bzo_2026).toBe(0);
    expect(r.data.net_chf.low).toBe(0);
    expect(r.data.net_chf.high).toBe(0);
  });
  it('garbage input: no_match', () => {
    const r = analyze('asdf qwerty', addresses, economics);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_match');
  });
});
