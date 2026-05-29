import { Ionicons } from '@expo/vector-icons';
import { rgb, useTheme } from '@workout-tracker/ui-mobile';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageSourcePropType } from 'react-native';
import type { PickerBrowseToolbarProps } from './types';

export function PickerBrowseToolbar({
  headerAction,
  onCreateExercise,
  onCreateSuperset,
}: PickerBrowseToolbarProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const badge = headerAction?.badge ?? 0;
  const [headerIconSrc, setHeaderIconSrc] = useState<ImageSourcePropType | null>(null);

  useEffect(() => {
    if (!headerAction) return;
    let cancelled = false;
    Ionicons.getImageSource(headerAction.androidIcon, 22, rgb(theme.foreground)).then((src) => {
      if (!cancelled) setHeaderIconSrc(src);
    });
    return () => {
      cancelled = true;
    };
  }, [headerAction, theme.foreground]);

  return (
    <>
      {headerAction && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button onPress={headerAction.onPress} disabled={headerAction.disabled}>
            {headerIconSrc ? (
              <Stack.Toolbar.Icon src={headerIconSrc} renderingMode="template" />
            ) : (
              <Stack.Toolbar.Icon sf={headerAction.iosIcon} />
            )}
            <Stack.Toolbar.Label>{headerAction.label}</Stack.Toolbar.Label>
            {badge > 0 && (
              <Stack.Toolbar.Badge
                style={{ backgroundColor: rgb(theme.primary), color: '#ffffff' }}
              >
                {String(badge)}
              </Stack.Toolbar.Badge>
            )}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}

      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Menu>
          <Stack.Toolbar.Icon sf="ellipsis.circle" />
          <Stack.Toolbar.Label>{t('exerciseListScreen.picker.actions.more')}</Stack.Toolbar.Label>
          <Stack.Toolbar.MenuAction icon="plus" onPress={onCreateExercise}>
            {t('exerciseListScreen.actions.createExercise')}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="link" onPress={onCreateSuperset}>
            {t('exerciseListScreen.picker.actions.createSuperset')}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}
