import { useState } from 'react';
import { fixtures } from './data/fixtureLoader';
import { analyzeLive, type Sources, type AnalyzeFailure } from './compute/analyze';
import type { LiveAnalysisResult, UserInputs, Ausbaustandard } from './data/types';
import { geocode } from './data/sources/geocoder';
import { fetchZoning } from './data/sources/zoning';
import { fetchBuilding } from './data/sources/building';
import { copy } from './lib/copy';
import { AddressInput } from './ui/AddressInput';
import { AusbaustandarRadio } from './ui/AusbaustandarRadio';
import { AskingPriceInput } from './ui/AskingPriceInput';
import { ResultCard } from './ui/ResultCard';
import { EmptyState } from './ui/EmptyState';

// Default Sources bundle wired with the real global fetch.
// Swap individual functions in tests to inject mocks.
const liveSources: Sources = {
  geocode: (query) => geocode(query),
  fetchZoning: (lat, lon) => fetchZoning(lat, lon),
  fetchBuilding: (gwrKey) => fetchBuilding(gwrKey),
};

type ViewState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'result'; data: LiveAnalysisResult }
  | { kind: 'no_match' }
  | { kind: 'error'; reason: AnalyzeFailure };

export function App() {
  const [state, setState] = useState<ViewState>({ kind: 'idle' });
  const [ausbaustandard, setAusbaustandard] = useState<Ausbaustandard>('mittel');
  const [askingPriceCHF, setAskingPriceCHF] = useState<number | undefined>(undefined);

  async function handleSubmit(input: string) {
    setState({ kind: 'loading' });
    const userInputs: UserInputs = { ausbaustandard };
    const result = await analyzeLive(
      input,
      userInputs,
      liveSources,
      fixtures.economics,
      fixtures.baukosten
    );
    if (result.ok) {
      setState({ kind: 'result', data: result.data });
    } else if (result.reason === 'no_match' || result.reason === 'no_stadtkreis') {
      setState({ kind: 'no_match' });
    } else if (result.reason === 'not_residential') {
      setState({ kind: 'error', reason: result.reason });
    } else {
      setState({ kind: 'error', reason: result.reason });
    }
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="border-b border-zinc-100 pb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-buildx-accent">
            {copy.app.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900">
            {copy.app.title}
          </h1>
          <p className="mt-2 text-sm text-zinc-400">{copy.app.subtitle}</p>
        </header>

        <div className="mt-8 flex flex-col gap-3">
          <AddressInput
            onSubmit={handleSubmit}
            isLoading={state.kind === 'loading'}
          />
          <AusbaustandarRadio
            value={ausbaustandard}
            onChange={setAusbaustandard}
            disabled={state.kind === 'loading'}
          />
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {state.kind === 'result' && (
            <ResultCard result={state.data} askingPriceCHF={askingPriceCHF} />
          )}
          {state.kind === 'result' && (
            <AskingPriceInput onChange={setAskingPriceCHF} />
          )}
          {state.kind === 'no_match' && (
            <EmptyState examples={fixtures.addresses} />
          )}
          {state.kind === 'error' && state.reason === 'not_residential' && (
            <EmptyState
              headline={copy.notResidentialState.headline}
              body={copy.notResidentialState.body}
            />
          )}
          {state.kind === 'error' && state.reason !== 'not_residential' && (
            <EmptyState
              headline={copy.errorState.headline}
              body={copy.errorState.body}
            />
          )}
        </div>
      </div>
    </div>
  );
}
