import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { type IconAction, SelectionToolbar } from '@/features/shared/components/SelectionToolbar';

export type WorkoutsSelectionToolbarProps = {
  count: number;
  onCancel: () => void;
  allSelected?: boolean;
  onToggleSelectAll?: () => void;
  showCopy?: boolean;
  onCopy?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
};

export function WorkoutsSelectionToolbar({
  count,
  onCancel,
  allSelected,
  onToggleSelectAll,
  showCopy,
  onCopy,
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
      actions={workoutSelectionActions(t, { showCopy, onCopy, onMove, onDelete })}
    />
  );
}

function workoutSelectionActions(
  t: TFunction,
  handlers: {
    showCopy?: boolean;
    onCopy?: () => void;
    onMove?: () => void;
    onDelete?: () => void;
  },
): IconAction[] {
  const actions: IconAction[] = [];

  if (handlers.showCopy) {
    actions.push({
      iosIcon: 'doc.on.doc',
      androidIcon: 'copy-outline',
      label: t('workoutsScreen.actions.copy'),
      onPress: handlers.onCopy ?? (() => {}),
    });
  }

  actions.push(
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
  );

  return actions;
}
