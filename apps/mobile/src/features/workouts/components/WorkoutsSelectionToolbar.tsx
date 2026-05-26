import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { type IconAction, SelectionToolbar } from '@/features/shared/components/SelectionToolbar';

export type WorkoutsSelectionToolbarProps = {
  count: number;
  onCancel: () => void;
  allSelected?: boolean;
  onToggleSelectAll?: () => void;
  onShare?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
};

export function WorkoutsSelectionToolbar({
  count,
  onCancel,
  allSelected,
  onToggleSelectAll,
  onShare,
  onMove,
  onDelete,
}: WorkoutsSelectionToolbarProps) {
  const { t } = useTranslation();
  return (
    <SelectionToolbar
      count={count}
      onCancel={onCancel}
      allSelected={allSelected}
      onToggleSelectAll={onToggleSelectAll}
      actions={workoutSelectionActions(t, { onShare, onMove, onDelete })}
    />
  );
}

function workoutSelectionActions(
  t: TFunction,
  handlers: { onShare?: () => void; onMove?: () => void; onDelete?: () => void },
): IconAction[] {
  return [
    {
      iosIcon: 'square.and.arrow.up',
      androidIcon: 'share-outline',
      label: t('workoutsScreen.actions.share'),
      onPress: handlers.onShare ?? (() => {}),
    },
    {
      iosIcon: 'folder',
      androidIcon: 'folder-outline',
      label: t('workoutsScreen.actions.move'),
      onPress: handlers.onMove ?? (() => {}),
    },
    {
      iosIcon: 'trash',
      androidIcon: 'trash-outline',
      label: t('workoutsScreen.actions.delete'),
      destructive: true,
      onPress: handlers.onDelete ?? (() => {}),
    },
  ];
}
