// Shown when address doesn't match the demo whitelist. Lists 3 example
// addresses to invite a successful retry. Spec §4.4.

import type { DemoAddress } from '../data/types';
import { copy } from '../lib/copy';

interface Props {
  examples?: readonly DemoAddress[];
  headline?: string;
  body?: string;
}

export function EmptyState({ examples, headline, body }: Props) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
      <p className="text-sm font-medium text-zinc-900">
        {headline ?? copy.emptyState.headline}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{body ?? copy.emptyState.body}</p>
      {examples && examples.length > 0 && (
        <ul className="mt-3 space-y-1">
          {examples.slice(0, 3).map((a) => (
            <li key={a.egid} className="text-xs text-zinc-700">
              {a.display}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
