import { PortalHost } from '@rn-primitives/portal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Autocomplete,
  BottomSheet,
  BottomSheetInput,
  type BottomSheetRef,
  BottomSheetView,
  Button,
  cn,
  Field,
  Icon,
  Text,
} from '@workout-tracker/ui-mobile';
import { Check, Pencil, Plus, Save, Trash2, X } from 'lucide-react-native';
import { type Ref, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import Toast from 'react-native-toast-message';
import type { VariationAlias } from '@/features/exercises/api/exercises';
import { exerciseObservability } from '@/features/observability/lib';
import { handleLocalError } from '@/features/query/lib/error-handling';
import {
  useCreateTrainingLocation,
  useTrainingLocations,
} from '@/features/training-locations/hooks/use-training-locations';

const SUGGESTIONS_PORTAL_HOST = 'variation-alias-picker.suggestions';

export type VariationAliasPickerArgs = {
  aliases: VariationAlias[];
  currentAliasId: string | null;
  onSelect: (aliasId: string | null) => void;
  /** Omit to make the picker select-only (no create), e.g. on the detail screen. */
  onCreate?: (name: string, locationId: string | null) => Promise<void>;
  /** Omit to disable inline editing of existing personalizations. */
  onUpdate?: (aliasId: string, name: string, locationId: string | null) => Promise<void>;
  /** Omit to disable deleting existing personalizations. */
  onDelete?: (aliasId: string) => Promise<void>;
};

export type VariationAliasPickerSheetRef = {
  present: (args: VariationAliasPickerArgs) => void;
  dismiss: () => void;
};

export function VariationAliasPickerSheet({
  ref,
  userId,
}: {
  ref?: Ref<VariationAliasPickerSheetRef>;
  userId?: string | null;
}) {
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const [args, setArgs] = useState<VariationAliasPickerArgs | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [locationText, setLocationText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocationText, setEditLocationText] = useState('');
  const [pendingDelete, setPendingDelete] = useState<VariationAlias | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: locations } = useTrainingLocations(userId);
  const createLocation = useCreateTrainingLocation({ userId });
  const locationOptions = useMemo(() => (locations ?? []).map((l) => l.name), [locations]);

  const reset = () => {
    setCreating(false);
    setName('');
    setLocationText('');
    setEditingId(null);
    setEditName('');
    setEditLocationText('');
    setPendingDelete(null);
    setSubmitting(false);
  };

  useImperativeHandle(ref, () => ({
    present: (nextArgs) => {
      setArgs(nextArgs);
      reset();
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const isEditing = editingId != null;
  const busy = isEditing || creating;

  const handleSelect = (aliasId: string | null) => {
    if (busy) return;
    args?.onSelect(aliasId);
    sheetRef.current?.dismiss();
  };

  const reportError = (error: unknown, action: string) =>
    handleLocalError((err) => {
      exerciseObservability.captureError(err, { action });
      Toast.show({
        type: 'error',
        text1: t('errors.unexpected.title'),
        text2: t('errors.unexpected.message'),
      });
    })(error);

  const resolveLocationId = async (text: string): Promise<string | null> => {
    const typed = text.trim();
    if (typed.length === 0) return null;
    const existing = (locations ?? []).find((l) => l.name === typed);
    if (existing) return existing.id;
    const created = await createLocation.mutateAsync({ name: typed });
    return created.id;
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!args?.onCreate || trimmed.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const locationId = await resolveLocationId(locationText);
      await args.onCreate(trimmed, locationId);
      exerciseObservability.trackAction('variation_alias_created');
      sheetRef.current?.dismiss();
    } catch (error) {
      reportError(error, 'create_variation_alias');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (alias: VariationAlias) => {
    setCreating(false);
    setEditingId(alias.id);
    setEditName(alias.name);
    const location = (locations ?? []).find((l) => l.id === alias.locationId);
    setEditLocationText(location?.name ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditLocationText('');
  };

  const handleUpdate = async () => {
    const trimmed = editName.trim();
    if (!args?.onUpdate || !editingId || trimmed.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const locationId = await resolveLocationId(editLocationText);
      await args.onUpdate(editingId, trimmed, locationId);
      exerciseObservability.trackAction('variation_alias_updated');
      setArgs((prev) =>
        prev
          ? {
              ...prev,
              aliases: prev.aliases.map((a) =>
                a.id === editingId ? { ...a, name: trimmed, locationId } : a,
              ),
            }
          : prev,
      );
      cancelEdit();
    } catch (error) {
      reportError(error, 'update_variation_alias');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!args?.onDelete || !target || submitting) return;
    setSubmitting(true);
    try {
      await args.onDelete(target.id);
      exerciseObservability.trackAction('variation_alias_deleted');
      const wasSelected = (args.currentAliasId ?? null) === target.id;
      if (wasSelected) args.onSelect(null);
      setArgs((prev) =>
        prev
          ? {
              ...prev,
              aliases: prev.aliases.filter((a) => a.id !== target.id),
              currentAliasId: wasSelected ? null : prev.currentAliasId,
            }
          : prev,
      );
    } catch (error) {
      reportError(error, 'delete_variation_alias');
    } finally {
      setSubmitting(false);
    }
  };

  const aliases = args?.aliases ?? [];
  const currentAliasId = args?.currentAliasId ?? null;

  return (
    <>
      <BottomSheet ref={sheetRef}>
        <BottomSheetView className="gap-4 px-5 pt-2 pb-8">
          <View className="gap-2">
            <Text variant="h4">{t('workoutExecutionScreen.aliasPicker.title')}</Text>
            <Text variant="muted" className="text-sm">
              {t('workoutExecutionScreen.aliasPicker.subtitle')}
            </Text>
          </View>

          <View className="gap-2">
            <AliasOption
              label={t('workoutExecutionScreen.aliasPicker.none')}
              selected={currentAliasId === null}
              selectDisabled={busy}
              onPress={() => handleSelect(null)}
            />
            {aliases.map((alias) =>
              editingId === alias.id ? (
                <AliasForm
                  key={alias.id}
                  name={editName}
                  onNameChange={setEditName}
                  locationText={editLocationText}
                  onLocationChange={setEditLocationText}
                  locationOptions={locationOptions}
                  onCancel={cancelEdit}
                  onSubmit={handleUpdate}
                  submitLabel={t('workoutExecutionScreen.aliasPicker.save')}
                  submitting={submitting}
                />
              ) : (
                <AliasOption
                  key={alias.id}
                  label={alias.name}
                  secondary={
                    (locations ?? []).find((l) => l.id === alias.locationId)?.name ?? undefined
                  }
                  selected={alias.id === currentAliasId}
                  selectDisabled={busy}
                  onPress={() => handleSelect(alias.id)}
                  onStartEdit={args?.onUpdate && !busy ? () => startEdit(alias) : undefined}
                  onDelete={args?.onDelete && !busy ? () => setPendingDelete(alias) : undefined}
                />
              ),
            )}
            {args?.onCreate && !isEditing ? (
              creating ? (
                <AliasForm
                  name={name}
                  onNameChange={setName}
                  locationText={locationText}
                  onLocationChange={setLocationText}
                  locationOptions={locationOptions}
                  onCancel={() => setCreating(false)}
                  onSubmit={handleCreate}
                  submitLabel={t('workoutExecutionScreen.aliasPicker.create')}
                  submitting={submitting}
                />
              ) : (
                <Button variant="outline" onPress={() => setCreating(true)}>
                  <Icon as={Plus} size={16} className="text-foreground" />
                  <Text className="font-sans-semibold text-sm">
                    {t('workoutExecutionScreen.aliasPicker.newMachine')}
                  </Text>
                </Button>
              )
            ) : null}
          </View>

          <PortalHost name={SUGGESTIONS_PORTAL_HOST} />
        </BottomSheetView>
      </BottomSheet>

      <AlertDialog open={pendingDelete != null}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">
              {t('workoutExecutionScreen.aliasPicker.deleteConfirm.title')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {t('workoutExecutionScreen.aliasPicker.deleteConfirm.message')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onPress={() => setPendingDelete(null)}>
              <Text>{t('workoutExecutionScreen.aliasPicker.deleteConfirm.cancel')}</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={confirmDelete} variant="destructive">
              <Text>{t('workoutExecutionScreen.aliasPicker.deleteConfirm.confirm')}</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AliasForm({
  name,
  onNameChange,
  locationText,
  onLocationChange,
  locationOptions,
  onCancel,
  onSubmit,
  submitLabel,
  submitting,
}: {
  name: string;
  onNameChange: (value: string) => void;
  locationText: string;
  onLocationChange: (value: string) => void;
  locationOptions: string[];
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const submitDisabled = submitting || name.trim().length === 0;
  return (
    <View className="flex-row items-end gap-2 rounded-lg border border-primary p-3">
      <Field label={t('workoutExecutionScreen.aliasPicker.nameLabel')} className="flex-1">
        <BottomSheetInput
          value={name}
          onChangeText={onNameChange}
          placeholder={t('workoutExecutionScreen.aliasPicker.namePlaceholder')}
          autoFocus
        />
      </Field>
      <Field label={t('workoutExecutionScreen.aliasPicker.locationLabel')} className="flex-1">
        <Autocomplete
          value={locationText}
          onChangeText={onLocationChange}
          onSelect={onLocationChange}
          options={locationOptions}
          placeholder={t('workoutExecutionScreen.aliasPicker.locationPlaceholder')}
          portalHost={SUGGESTIONS_PORTAL_HOST}
          inBottomSheet
        />
      </Field>
      <Pressable
        onPress={onSubmit}
        disabled={submitDisabled}
        accessibilityRole="button"
        accessibilityLabel={submitLabel}
        hitSlop={8}
        className="h-10 items-center justify-center"
      >
        <Icon
          as={Save}
          size={20}
          className={cn('text-primary', submitDisabled && 'text-muted-foreground/50')}
        />
      </Pressable>
      <Pressable
        onPress={onCancel}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={t('workoutExecutionScreen.aliasPicker.cancel')}
        hitSlop={8}
        className="h-10 items-center justify-center"
      >
        <Icon as={X} size={20} className="text-muted-foreground" />
      </Pressable>
    </View>
  );
}

function AliasOption({
  label,
  secondary,
  selected,
  selectDisabled,
  onPress,
  onStartEdit,
  onDelete,
}: {
  label: string;
  secondary?: string;
  selected: boolean;
  selectDisabled?: boolean;
  onPress: () => void;
  onStartEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={selectDisabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: selectDisabled }}
      className={cn(
        'flex-row items-center gap-3 rounded-lg border border-border p-3',
        selected && 'border-primary bg-primary/5',
        selectDisabled && 'opacity-50',
      )}
    >
      <View className="flex-1">
        <Text className="font-sans-semibold text-sm" numberOfLines={1}>
          {label}
        </Text>
        {secondary ? (
          <Text variant="muted" className="text-xs" numberOfLines={1}>
            {secondary}
          </Text>
        ) : null}
      </View>
      {selected ? <Icon as={Check} size={16} className="text-primary" /> : null}
      {onStartEdit ? (
        <Pressable onPress={onStartEdit} accessibilityRole="button" hitSlop={8}>
          <Icon as={Pencil} size={16} className="text-muted-foreground" />
        </Pressable>
      ) : null}
      {onDelete ? (
        <Pressable onPress={onDelete} accessibilityRole="button" hitSlop={8}>
          <Icon as={Trash2} size={16} className="text-destructive" />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
