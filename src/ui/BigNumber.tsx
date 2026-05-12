// Reusable label / value / caption block. Used for m², CHF, confidence.

interface Props {
  label: string;
  value: string;
  caption?: string;
  /** Optional second line shown beneath the caption (e.g. BZO 2016 compare). */
  secondary?: string;
}

export function BigNumber({ label, value, caption, secondary }: Props) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-buildx-accent">
        {value}
      </p>
      {caption && (
        <p className="mt-1 text-xs text-zinc-500">{caption}</p>
      )}
      {secondary && (
        <p className="mt-0.5 text-xs text-zinc-500">{secondary}</p>
      )}
    </div>
  );
}
