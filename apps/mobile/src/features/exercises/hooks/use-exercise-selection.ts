import { useState } from 'react';

type Mode = 'browse' | 'select';

export function useExerciseSelection(allIds: string[]) {
  const [mode, setMode] = useState<Mode>('browse');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const enterSelect = (id?: string) => {
    setMode('select');
    setSelected(id ? new Set([id]) : new Set());
  };

  const exitSelect = () => {
    setMode('browse');
    setSelected(new Set());
  };

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelected((prev) => (prev.size === allIds.length ? new Set() : new Set(allIds)));

  const allSelected = allIds.length > 0 && selected.size === allIds.length;

  return {
    mode,
    selected,
    allSelected,
    enterSelect,
    exitSelect,
    toggle,
    toggleSelectAll,
  };
}
