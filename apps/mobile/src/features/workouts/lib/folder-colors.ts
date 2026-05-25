import { WORKOUT_FOLDER_COLORS, type WorkoutFolderColor } from '@workout-tracker/domain';

type FolderColorClasses = { color: string; iconColor: string; swatch: string };

export { WORKOUT_FOLDER_COLORS, type WorkoutFolderColor };

const FOLDER_COLOR_MAP: Record<WorkoutFolderColor, FolderColorClasses> = {
  blue: { color: 'bg-blue-950', iconColor: 'text-blue-400', swatch: 'bg-blue-500' },
  green: { color: 'bg-emerald-950', iconColor: 'text-emerald-400', swatch: 'bg-emerald-500' },
  amber: { color: 'bg-amber-950', iconColor: 'text-amber-400', swatch: 'bg-amber-500' },
  red: { color: 'bg-red-950', iconColor: 'text-red-400', swatch: 'bg-red-500' },
  purple: { color: 'bg-purple-950', iconColor: 'text-purple-400', swatch: 'bg-purple-500' },
  pink: { color: 'bg-pink-950', iconColor: 'text-pink-400', swatch: 'bg-pink-500' },
  cyan: { color: 'bg-cyan-950', iconColor: 'text-cyan-400', swatch: 'bg-cyan-500' },
  slate: { color: 'bg-slate-800', iconColor: 'text-slate-400', swatch: 'bg-slate-400' },
};

const FALLBACK: FolderColorClasses = {
  color: 'bg-slate-800',
  iconColor: 'text-slate-400',
  swatch: 'bg-slate-400',
};

export function resolveFolderColor(name: string): FolderColorClasses {
  return FOLDER_COLOR_MAP[name as WorkoutFolderColor] ?? FALLBACK;
}
