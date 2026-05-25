type FolderColorClasses = { color: string; iconColor: string };

const FOLDER_COLOR_MAP: Record<string, FolderColorClasses> = {
  blue: { color: 'bg-blue-950', iconColor: 'text-blue-400' },
  green: { color: 'bg-emerald-950', iconColor: 'text-emerald-400' },
  amber: { color: 'bg-amber-950', iconColor: 'text-amber-400' },
  red: { color: 'bg-red-950', iconColor: 'text-red-400' },
  purple: { color: 'bg-purple-950', iconColor: 'text-purple-400' },
  pink: { color: 'bg-pink-950', iconColor: 'text-pink-400' },
  cyan: { color: 'bg-cyan-950', iconColor: 'text-cyan-400' },
  slate: { color: 'bg-slate-800', iconColor: 'text-slate-400' },
};

const FALLBACK: FolderColorClasses = { color: 'bg-slate-800', iconColor: 'text-slate-400' };

export function resolveFolderColor(name: string): FolderColorClasses {
  return FOLDER_COLOR_MAP[name] ?? FALLBACK;
}
