import { Text } from '@workout-tracker/ui-mobile';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Upload, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { exerciseObservability } from '@/features/observability/lib';
import { type VideoContentType, validatePickedVideo } from '../lib/video-validation';

export type SelectedVideo = {
  uri: string;
  fileName: string | null;
  /** Video length in milliseconds, or `null` when the device did not report it. */
  durationMs: number | null;
  /** File size in bytes, or `null` when the device did not report it. */
  sizeBytes: number | null;
  contentType: VideoContentType;
};

export type ExerciseVideoPickerProps = {
  value: SelectedVideo | null;
  onChange: (video: SelectedVideo | null) => void;
  /** Locks picking and removing while an upload is in flight. */
  disabled?: boolean;
  /**
   * Playable URL of a video already uploaded to the server (edit mode). Shown
   * when no new video has been picked; removing it calls `onRemoveExisting`.
   */
  existingVideoUrl?: string | null;
  /** Called when the user removes the already-uploaded video. */
  onRemoveExisting?: () => void;
};

/**
 * Seleção do vídeo de demonstração a partir da galeria do dispositivo.
 *
 * Componente controlado: o vídeo escolhido vive no formulário pai, que o envia
 * ao R2 ao salvar. Aqui cuidamos apenas de escolher, validar (formato, tamanho
 * e duração) e pré-visualizar. Na edição, também mostra o vídeo já enviado.
 */
export function ExerciseVideoPicker({
  value,
  onChange,
  disabled = false,
  existingVideoUrl = null,
  onRemoveExisting,
}: ExerciseVideoPickerProps) {
  const { t } = useTranslation();

  async function handlePick() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsMultipleSelection: false,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset) return;

      const validation = validatePickedVideo({
        fileSize: asset.fileSize,
        durationMs: asset.duration,
        mimeType: asset.mimeType,
      });
      if (!validation.ok) {
        exerciseObservability.trackAction('exercise_video_rejected', { reason: validation.reason });
        Toast.show({
          type: 'error',
          text1: t(`exerciseListScreen.addExercise.video.errors.${validation.reason}.title`),
          text2: t(`exerciseListScreen.addExercise.video.errors.${validation.reason}.message`),
        });
        return;
      }

      onChange({
        uri: asset.uri,
        fileName: asset.fileName ?? null,
        durationMs: asset.duration ?? null,
        sizeBytes: asset.fileSize ?? null,
        contentType: validation.contentType,
      });
      exerciseObservability.trackAction('exercise_video_selected');
    } catch (error) {
      exerciseObservability.captureError(error, { action: 'pick_exercise_video' });
      Toast.show({
        type: 'error',
        text1: t('errors.unexpected.title'),
        text2: t('errors.unexpected.message'),
      });
    }
  }

  return (
    <View className="gap-2">
      <Text className="font-sans-semibold">{t('exerciseListScreen.addExercise.video.label')}</Text>

      {value ? (
        <VideoPreview uri={value.uri} disabled={disabled} onRemove={() => onChange(null)} />
      ) : existingVideoUrl ? (
        <VideoPreview
          uri={existingVideoUrl}
          disabled={disabled}
          onRemove={() => onRemoveExisting?.()}
        />
      ) : (
        <>
          <Text variant="muted">{t('exerciseListScreen.addExercise.video.hint')}</Text>
          <Pressable
            onPress={handlePick}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={t('exerciseListScreen.addExercise.video.select')}
            testID="add-exercise.video.select"
            className="mt-1 flex-row items-center justify-center gap-2 rounded-md border border-border border-dashed bg-muted/40 px-4 py-6 active:opacity-70"
          >
            <Upload size={18} color="#a1a1aa" />
            <Text variant="muted">{t('exerciseListScreen.addExercise.video.select')}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function VideoPreview({
  uri,
  disabled,
  onRemove,
}: {
  uri: string;
  disabled: boolean;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  return (
    <View className="gap-2" testID="add-exercise.video.preview">
      <View className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls
        />
      </View>
      {disabled ? null : (
        <View className="flex-row justify-end">
          <Pressable
            onPress={onRemove}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('exerciseListScreen.addExercise.video.remove')}
            testID="add-exercise.video.remove"
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <X size={16} color="#a1a1aa" />
            <Text variant="muted">{t('exerciseListScreen.addExercise.video.remove')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
