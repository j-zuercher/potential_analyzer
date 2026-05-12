// Single text input + submit. 600-900ms artificial delay for demo feel.
// Spec §4.1, brick C2.

import { useState, type FormEvent } from 'react';
import { copy } from '../lib/copy';

interface Props {
  onSubmit: (input: string) => void;
  isLoading: boolean;
}

export function AddressInput({ onSubmit, isLoading }: Props) {
  const [value, setValue] = useState('');

  function handle(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || isLoading) return;
    onSubmit(value);
  }

  return (
    <form onSubmit={handle} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={copy.input.placeholder}
        disabled={isLoading}
        className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-buildx-accent focus:ring-2 focus:ring-buildx-accent/20 disabled:bg-zinc-100"
      />
      <button
        type="submit"
        disabled={isLoading || !value.trim()}
        className="rounded-md bg-buildx-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-700 disabled:bg-zinc-300"
      >
        {isLoading ? copy.input.submitting : copy.input.submit}
      </button>
    </form>
  );
}
