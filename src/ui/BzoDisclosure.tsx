// Footer disclosure on the result card. Spec §4.2 final row.

import { copy } from '../lib/copy';

export function BzoDisclosure() {
  return (
    <p className="border-t border-zinc-200 pt-3 text-[11px] text-zinc-500">
      {copy.result.bzoFooter}
    </p>
  );
}
